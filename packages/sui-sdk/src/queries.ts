/**
 * 온체인 데이터 조회 함수.
 *
 * 오브젝트 필드 조회와 이벤트 쿼리에 JSON-RPC 클라이언트를 사용한다(필드가 파싱된 JSON으로
 * 오고, 이벤트 쿼리는 gRPC Core API에 대응 메서드가 없기 때문). 실행/오브젝트 변경은 gRPC를 쓴다.
 * 라운지 단위 방명록 피드, 결혼식 단위 RSVP·축의금 현황은 이벤트로 구성하고 wedding/lounge ID로
 * 클라이언트에서 필터링한다.
 */

import type { SuiJsonRpcClient, SuiObjectResponse, SuiEvent } from '@mysten/sui/jsonRpc';
import { moveTarget } from './constants';

// === 파싱 헬퍼 ===

type Fields = Record<string, unknown>;

function objectFields(res: SuiObjectResponse): Fields | null {
  const content = res.data?.content;
  if (content && content.dataType === 'moveObject') {
    return content.fields as Fields;
  }
  return null;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function asNumber(v: unknown): number {
  // u64는 JSON에서 문자열로 온다. 주의: 2^53 초과 값은 정밀도 손실이 생기므로,
  // 이 헬퍼는 타임스탬프(ms, ~서기 287000년까지 안전)·companion_count(≤20처럼 작은 값)
  // 등 범위가 보장된 u64 에만 쓴다. 금액(balance/amount)은 BigInt로 따로 파싱한다.
  return typeof v === 'number' ? v : Number(v ?? 0);
}

/** Move Option<T>는 직렬화 형태가 환경에 따라 달라(값/null/{vec:[]}) — 모두 방어적으로 처리. */
function optString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'vec' in v) {
    const vec = (v as { vec: unknown }).vec;
    return Array.isArray(vec) && vec.length > 0 ? asString(vec[0]) : null;
  }
  return null;
}

// === 오브젝트 조회 타입 ===

export interface WeddingOnChain {
  id: string;
  status: string;
  groomName: string;
  brideName: string;
  groomFatherName: string | null;
  groomMotherName: string | null;
  brideFatherName: string | null;
  brideMotherName: string | null;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  venueHall: string | null;
  hosts: string[];
  vaultId: string | null;
}

export interface WeddingLoungeOnChain {
  id: string;
  weddingId: string;
  name: string;
}

export interface CashGiftVaultOnChain {
  id: string;
  weddingId: string;
  /** MIST 단위 잔액. */
  balance: bigint;
}

export interface MoiItemOnChain {
  id: string;
  name: string;
  itemType: string;
  slot: string;
}

export interface IumOnChain {
  id: string;
  fromUser: string;
  toUser: string;
  relationType: string;
  label: string;
  createdAt: number;
}

// === 오브젝트 조회 ===

/** Wedding 공유 오브젝트 조회. */
export async function getWedding(
  client: SuiJsonRpcClient,
  weddingId: string,
): Promise<WeddingOnChain | null> {
  const res = await client.getObject({ id: weddingId, options: { showContent: true } });
  const f = objectFields(res);
  if (!f) return null;
  return {
    id: weddingId,
    status: asString(f.status),
    groomName: asString(f.groom_name),
    brideName: asString(f.bride_name),
    groomFatherName: optString(f.groom_father_name),
    groomMotherName: optString(f.groom_mother_name),
    brideFatherName: optString(f.bride_father_name),
    brideMotherName: optString(f.bride_mother_name),
    date: asString(f.date),
    time: asString(f.time),
    venueName: asString(f.venue_name),
    venueAddress: asString(f.venue_address),
    venueHall: optString(f.venue_hall),
    hosts: Array.isArray(f.host_addresses) ? (f.host_addresses as unknown[]).map(asString) : [],
    vaultId: optString(f.vault_id),
  };
}

/** WeddingLounge 공유 오브젝트 조회. */
export async function getWeddingLounge(
  client: SuiJsonRpcClient,
  loungeId: string,
): Promise<WeddingLoungeOnChain | null> {
  const res = await client.getObject({ id: loungeId, options: { showContent: true } });
  const f = objectFields(res);
  if (!f) return null;
  return { id: loungeId, weddingId: asString(f.wedding_id), name: asString(f.name) };
}

/** 축의금 모금함 조회(잔액 포함). Balance<SUI>는 fields.balance에 u64 문자열로 온다. */
export async function getCashGiftVault(
  client: SuiJsonRpcClient,
  vaultId: string,
): Promise<CashGiftVaultOnChain | null> {
  const res = await client.getObject({ id: vaultId, options: { showContent: true } });
  const f = objectFields(res);
  if (!f) return null;
  return {
    id: vaultId,
    weddingId: asString(f.wedding_id),
    balance: BigInt(asString(f.balance ?? '0')),
  };
}

/** 주소가 소유한 특정 타입 오브젝트를 모두 조회(페이지네이션 포함). */
async function listOwnedByType(
  client: SuiJsonRpcClient,
  owner: string,
  structType: string,
): Promise<SuiObjectResponse[]> {
  const out: SuiObjectResponse[] = [];
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({
      owner,
      filter: { StructType: structType },
      options: { showContent: true },
      cursor,
    });
    out.push(...page.data);
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);
  return out;
}

/** 주소가 소유한 MoiItem 목록. */
export async function getOwnedMoiItems(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<MoiItemOnChain[]> {
  const objs = await listOwnedByType(client, owner, moveTarget('moi', 'MoiItem'));
  const items: MoiItemOnChain[] = [];
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data) {
      items.push({
        id: res.data.objectId,
        name: asString(f.name),
        itemType: asString(f.item_type),
        slot: asString(f.slot),
      });
    }
  }
  return items;
}

/** 주소가 소유한 Ium(신뢰 관계) 목록. */
export async function getOwnedIums(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<IumOnChain[]> {
  const objs = await listOwnedByType(client, owner, moveTarget('ium', 'Ium'));
  const items: IumOnChain[] = [];
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data) {
      items.push({
        id: res.data.objectId,
        fromUser: asString(f.from_user),
        toUser: asString(f.to_user),
        relationType: asString(f.relation_type),
        label: asString(f.label),
        createdAt: asNumber(f.created_at),
      });
    }
  }
  return items;
}

/** 주소가 소유한 WeddingCap의 오브젝트 ID 목록(호스트가 자신의 Cap을 찾을 때). */
export async function getOwnedWeddingCapIds(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<string[]> {
  const objs = await listOwnedByType(client, owner, moveTarget('wedding', 'WeddingCap'));
  return objs.filter((o) => o.data).map((o) => o.data!.objectId);
}

// === 이벤트 조회 타입 ===

export interface GuestbookFeedItem {
  entryId: string;
  loungeId: string;
  author: string;
  guestName: string;
  message: string;
}

export interface RsvpEvent {
  weddingId: string;
  submitter: string;
  recipientSlot: string;
  guestName: string;
  attendance: string;
  companionCount: number;
  meal: string;
  submittedAt: number;
}

export interface CashGiftEvent {
  recordId: string;
  weddingId: string;
  guestName: string;
  recipientSlot: string;
  relationCategory: string;
  amount: bigint;
  createdAt: number;
}

/**
 * 특정 MoveEventType 이벤트를 모두 조회(페이지네이션 포함).
 *
 * ⚠️ 스케일 주의: JSON-RPC queryEvents는 이벤트 *필드*(lounge_id 등) 기준 필터를 지원하지
 * 않아, 아래 피드/현황 함수들은 이 함수로 패키지 전역의 해당 타입 이벤트를 모두 가져온 뒤
 * 클라이언트에서 wedding/lounge ID로 거른다. 결혼식 수가 많아지면 O(전체 이벤트)라 느려지고
 * 레이트리밋에 걸릴 수 있다. 프로덕션에서는 전용 인덱서(sui-indexer-alt-framework로 체크포인트
 * 스트리밍 → 자체 DB)로 ID별 인덱스를 만들어 이 함수를 대체해야 한다. (MVP/테스트넷 한정 사용.)
 */
async function queryAllEvents(
  client: SuiJsonRpcClient,
  eventType: string,
): Promise<SuiEvent[]> {
  const out: SuiEvent[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null | undefined = null;
  do {
    const page = await client.queryEvents({
      query: { MoveEventType: eventType },
      cursor,
      order: 'ascending',
    });
    out.push(...page.data);
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);
  return out;
}

/** 라운지의 방명록 피드(GuestbookEntryCreated 이벤트 → lounge_id 필터). */
export async function getGuestbookFeed(
  client: SuiJsonRpcClient,
  loungeId: string,
): Promise<GuestbookFeedItem[]> {
  const events = await queryAllEvents(client, moveTarget('guestbook', 'GuestbookEntryCreated'));
  const out: GuestbookFeedItem[] = [];
  for (const e of events) {
    const p = e.parsedJson as Record<string, unknown>;
    if (asString(p.lounge_id) !== loungeId) continue;
    out.push({
      entryId: asString(p.entry_id),
      loungeId: asString(p.lounge_id),
      author: asString(p.author),
      guestName: asString(p.guest_name),
      message: asString(p.message),
    });
  }
  return out;
}

/** 결혼식의 RSVP 현황(RsvpSubmitted 이벤트 → wedding_id 필터). */
export async function getRsvpEvents(
  client: SuiJsonRpcClient,
  weddingId: string,
): Promise<RsvpEvent[]> {
  const events = await queryAllEvents(client, moveTarget('rsvp', 'RsvpSubmitted'));
  const out: RsvpEvent[] = [];
  for (const e of events) {
    const p = e.parsedJson as Record<string, unknown>;
    if (asString(p.wedding_id) !== weddingId) continue;
    out.push({
      weddingId: asString(p.wedding_id),
      submitter: asString(p.submitter),
      recipientSlot: asString(p.recipient_slot),
      guestName: asString(p.guest_name),
      attendance: asString(p.attendance),
      companionCount: asNumber(p.companion_count),
      meal: asString(p.meal),
      submittedAt: asNumber(p.submitted_at),
    });
  }
  return out;
}

/** 결혼식의 축의금 현황(CashGiftSent 이벤트 → wedding_id 필터). */
export async function getCashGiftEvents(
  client: SuiJsonRpcClient,
  weddingId: string,
): Promise<CashGiftEvent[]> {
  const events = await queryAllEvents(client, moveTarget('cash_gift', 'CashGiftSent'));
  const out: CashGiftEvent[] = [];
  for (const e of events) {
    const p = e.parsedJson as Record<string, unknown>;
    if (asString(p.wedding_id) !== weddingId) continue;
    out.push({
      recordId: asString(p.record_id),
      weddingId: asString(p.wedding_id),
      guestName: asString(p.guest_name),
      recipientSlot: asString(p.recipient_slot),
      relationCategory: asString(p.relation_category),
      amount: BigInt(asString(p.amount ?? '0')),
      createdAt: asNumber(p.created_at),
    });
  }
  return out;
}
