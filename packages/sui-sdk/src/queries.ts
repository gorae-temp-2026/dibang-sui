// ✅ 이 파일 = 온체인(Sui) 읽기 = 트러스트/Wedding 데이터의 SSOT 경로. 앱이 DB 대신 *이 쿼리들*로 읽도록 이관하는 게 목표(미완).
//    현재 앱이 전환기로 DB(Go/Supabase)에서 읽는 건 "DB 우선"이 아니라 미완 이관. 상세: _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언.
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
  hosts: string[];
  vaultId: string | null;
  /** 이 결혼식을 관통하는 신뢰 그래프 이벤트(gathering::Event) ID. */
  eventId: string;
}
// 표시 콘텐츠(신랑·신부·부모 이름, 날짜·시간·예식장)는 *온체인에 없다*(결정#2) — 앱 API/Supabase(weddings)에서 조회.

export interface WeddingLoungeOnChain {
  id: string;
  weddingId: string;
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
    // 새 컨트랙트(§1-5): primary_host만 온체인 저장. 공동혼주는 Cap 보유자(getOwnedWeddingCapIds 등 별도 조회).
    hosts: [asString(f.primary_host)],
    vaultId: optString(f.vault_id),
    eventId: asString(f.event_id),
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
  return { id: loungeId, weddingId: asString(f.wedding_id) };
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

/** 주소가 소유한 WeddingCap의 오브젝트 ID 목록(호스트가 자신의 Cap을 찾을 때). */
export async function getOwnedWeddingCapIds(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<string[]> {
  const objs = await listOwnedByType(client, owner, moveTarget('wedding', 'WeddingCap'));
  return objs.filter((o) => o.data).map((o) => o.data!.objectId);
}

/**
 * 주소가 소유한 WeddingCap 중 특정 weddingId를 가리키는 Cap의 ID(없으면 null).
 * add_host·withdraw가 요구하는 Cap을 결혼식별로 찾을 때 사용(Cap.wedding_id 필드 매칭).
 */
export async function getWeddingCapForWedding(
  client: SuiJsonRpcClient,
  owner: string,
  weddingId: string,
): Promise<string | null> {
  const objs = await listOwnedByType(client, owner, moveTarget('wedding', 'WeddingCap'));
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data && asString(f.wedding_id) === weddingId) {
      return res.data.objectId;
    }
  }
  return null;
}

// === 이벤트 조회 타입 ===

export interface RsvpEvent {
  weddingId: string;
  submitter: string;
  /** u8 코드(§1-6): groom=0·bride=1·groom_father=2·groom_mother=3·bride_father=4·bride_mother=5. 라벨은 오프체인. */
  recipientSlot: number;
  /** u8: attending=0, absent=1. */
  attendance: number;
  companionCount: number;
  /** u8: yes=0, no=1, undecided=2. */
  meal: number;
  submittedAt: number;
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
      recipientSlot: asNumber(p.recipient_slot),
      attendance: asNumber(p.attendance),
      companionCount: asNumber(p.companion_count),
      meal: asNumber(p.meal),
      submittedAt: asNumber(p.submitted_at),
    });
  }
  return out;
}

// === 신뢰 → 신용 이벤트 조회 (credit.ts 입력 경로) ===
// 컨트랙트가 emit하는 raw 신호를 credit.ts가 소비하는 shape로 가져온다(온체인 raw → 오프체인 신용, 결정#12).
// ⚠️ queryAllEvents 전역 스캔 한계 동일 — 프로덕션은 전용 인덱서. amount는 number(부조 범위 안전; >2^53 주의).

/** ledger::ActionLogged — 보편 액션 원장(부조·방명록·초대·선물·이음수락). credit.ts ActionLoggedEvent와 동형. */
export interface ActionLoggedQuery {
  eventId: string;
  actionType: number;
  actor: string;
  target: string | null;
  roleId: number;
  amount: number;
  ts: number;
}

export async function getActionLoggedEvents(client: SuiJsonRpcClient): Promise<ActionLoggedQuery[]> {
  const events = await queryAllEvents(client, moveTarget('ledger', 'ActionLogged'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return {
      eventId: asString(p.event_id),
      actionType: asNumber(p.action_type),
      actor: asString(p.actor),
      target: optString(p.target),
      roleId: asNumber(p.role_id),
      amount: asNumber(p.amount),
      ts: asNumber(p.created_at_ms),
    };
  });
}

/** event::EventCreated — 이벤트 인스턴스(event_type·creator). credit.ts EventCreatedEvent와 동형. */
export interface EventCreatedQuery {
  eventId: string;
  eventType: number;
  creator: string;
}

export async function getEventCreatedEvents(client: SuiJsonRpcClient): Promise<EventCreatedQuery[]> {
  const events = await queryAllEvents(client, moveTarget('event', 'EventCreated'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { eventId: asString(p.event_id), eventType: asNumber(p.event_type), creator: asString(p.creator) };
  });
}

/** event::Participated — 참가(역할). credit.ts ParticipatedEvent와 동형(참석 CS 입력). */
export interface ParticipatedQuery {
  eventId: string;
  participant: string;
  roleId: number;
}

export async function getParticipatedEvents(client: SuiJsonRpcClient): Promise<ParticipatedQuery[]> {
  const events = await queryAllEvents(client, moveTarget('event', 'Participated'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { eventId: asString(p.event_id), participant: asString(p.participant), roleId: asNumber(p.role_id) };
  });
}

/**
 * signal::SignalEmitted — **온체인에서 분류된 신호**(부조/유대, kind). credit.ts의 주 입력.
 * 분류=온체인 SSOT이므로 credit은 이걸 fold→Φ만 하면 됨(action/event/role 재분류 불필요).
 * 한 액션이 여러 SignalEmitted를 낼 수 있음(fan-out). magnitude=EM 금액/CS 1.
 */
export interface SignalQuery {
  eventId: string;
  kind: number;
  /** 자원 식별(EM 돈=0, CS=0). (kind, resource_id) = 온체인 TrustMatrix 타입 키. signal.move 결정#43. */
  resourceId: number;
  /** 원천 행위(action_type / 참석=5 / 매칭=2) — 오프체인 행위별 CS 차등 가중용. */
  source: number;
  from: string;
  to: string;
  magnitude: number;
  ts: number;
}

export async function getSignalEvents(client: SuiJsonRpcClient): Promise<SignalQuery[]> {
  const events = await queryAllEvents(client, moveTarget('signal', 'SignalEmitted'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return {
      eventId: asString(p.event_id),
      kind: asNumber(p.kind),
      resourceId: asNumber(p.resource_id),
      source: asNumber(p.source),
      from: asString(p.from),
      to: asString(p.to),
      magnitude: asNumber(p.magnitude),
      ts: asNumber(p.created_at_ms),
    };
  });
}
