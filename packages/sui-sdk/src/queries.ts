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
import { eventType } from './constants';

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

export interface MoiOnChain {
  id: string;
  owner: string;
  /** 장착 슬롯→MoiItem 객체 ID 매핑(온체인 VecMap<String, ID>). */
  equipped: Record<string, string>;
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
  const objs = await listOwnedByType(client, owner, eventType('moi', 'MoiItem'));
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

/** Moi 오브젝트 조회(장착 상태 포함). equipped는 VecMap<String, ID> → Record<slot, itemId>. */
export async function getMoi(
  client: SuiJsonRpcClient,
  moiId: string,
): Promise<MoiOnChain | null> {
  const res = await client.getObject({ id: moiId, options: { showContent: true } });
  const f = objectFields(res);
  if (!f) return null;
  const equipped: Record<string, string> = {};
  const raw = f.equipped;
  if (raw && typeof raw === 'object' && 'fields' in (raw as Record<string, unknown>)) {
    const contents = ((raw as Record<string, unknown>).fields as Record<string, unknown>)?.contents;
    if (Array.isArray(contents)) {
      for (const entry of contents) {
        const ef = (entry as Record<string, unknown>).fields as Record<string, unknown> | undefined;
        if (ef) equipped[asString(ef.key)] = asString(ef.value);
      }
    }
  }
  return { id: moiId, owner: asString(f.owner), equipped };
}

/** 주소가 소유한 Moi(아바타) 오브젝트 ID 목록. soulbound 1인 1개 원칙이라 보통 0개 또는 1개. */
export async function getOwnedMoiIds(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<string[]> {
  const objs = await listOwnedByType(client, owner, eventType('moi', 'Moi'));
  return objs.filter((o) => o.data).map((o) => o.data!.objectId);
}

/** 주소가 소유한 WeddingCap의 오브젝트 ID 목록(호스트가 자신의 Cap을 찾을 때). */
export async function getOwnedWeddingCapIds(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<string[]> {
  const objs = await listOwnedByType(client, owner, eventType('wedding', 'WeddingCap'));
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
  const objs = await listOwnedByType(client, owner, eventType('wedding', 'WeddingCap'));
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data && asString(f.wedding_id) === weddingId) {
      return res.data.objectId;
    }
  }
  return null;
}

/** 주소가 소유한 Participation(이벤트 참가 증명) 중 특정 eventId에 대한 것을 조회. */
export interface ParticipationOnChain {
  id: string;
  eventId: string;
  eventType: number;
  participant: string;
  roleId: number;
}

export async function getParticipationForEvent(
  client: SuiJsonRpcClient,
  owner: string,
  eventId: string,
): Promise<ParticipationOnChain | null> {
  const objs = await listOwnedByType(client, owner, eventType('event', 'Participation'));
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data && asString(f.event_id) === eventId) {
      return {
        id: res.data.objectId,
        eventId: asString(f.event_id),
        eventType: asNumber(f.event_type),
        participant: asString(f.participant),
        roleId: asNumber(f.role_id),
      };
    }
  }
  return null;
}

/** 사용자가 보유한 Participation 중 아무 거나 하나 반환. DM처럼 특정 이벤트를 모를 때 신호 기록용. */
export async function getAnyParticipation(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<ParticipationOnChain | null> {
  const objs = await listOwnedByType(client, owner, eventType('event', 'Participation'));
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data) {
      return {
        id: res.data.objectId,
        eventId: asString(f.event_id),
        eventType: asNumber(f.event_type),
        participant: asString(f.participant),
        roleId: asNumber(f.role_id),
      };
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
    try {
      const page = await client.queryEvents({
        query: { MoveEventType: eventType },
        cursor,
        order: 'ascending',
      });
      out.push(...page.data);
      cursor = page.hasNextPage ? page.nextCursor : null;
    } catch {
      break;
    }
  } while (cursor);
  return out;
}

/** 결혼식의 RSVP 현황(RsvpSubmitted 이벤트 → wedding_id 필터). */
export async function getRsvpEvents(
  client: SuiJsonRpcClient,
  weddingId: string,
): Promise<RsvpEvent[]> {
  const events = await queryAllEvents(client, eventType('rsvp', 'RsvpSubmitted'));
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

// === 청첩장(Invitation) 조회 ===
// 온체인 Invitation은 wedding_id로 묶인 공유 오브젝트. 이름(신랑·신부)·커버 사진 필드엔 평문이 아니라
// Walrus blobId가 들어있다(VISION §7) → 표시 시 walrusFetch(String/PIIString)로 원본을 복원한다.

export interface InvitationOnChain {
  id: string;
  weddingId: string;
  creator: string;
  slug: string;
  /** 신랑 이름의 Walrus blobId(평문 아님 — walrusFetchString으로 복원). 미탑재 시 ''. */
  groomNameBlobId: string;
  /** 신부 이름의 Walrus blobId(평문 아님). 미탑재 시 ''. */
  brideNameBlobId: string;
  date: string;
  time: string;
  venueName: string;
  venueHall: string;
  /** 커버 사진의 Walrus blobId(평문 아님 — walrusFetch로 복원). 미탑재 시 ''. */
  coverPhotoBlobId: string;
  /** 인사말의 Walrus blobId(평문 아님 — walrusFetchString으로 복원). 미탑재 시 ''. */
  greetingBlobId: string;
}

/** Invitation 공유 오브젝트 조회(객체 ID로). */
export async function getInvitation(
  client: SuiJsonRpcClient,
  invitationId: string,
): Promise<InvitationOnChain | null> {
  const res = await client.getObject({ id: invitationId, options: { showContent: true } });
  const f = objectFields(res);
  if (!f) return null;
  return {
    id: invitationId,
    weddingId: asString(f.wedding_id),
    creator: asString(f.creator),
    slug: asString(f.slug),
    groomNameBlobId: asString(f.groom_name),
    brideNameBlobId: asString(f.bride_name),
    date: asString(f.date),
    time: asString(f.time),
    venueName: asString(f.venue_name),
    venueHall: asString(f.venue_hall),
    coverPhotoBlobId: asString(f.cover_photo_url),
    greetingBlobId: asString(f.greeting),
  };
}

/**
 * 한 결혼식의 온체인 청첩장 조회. InvitationCreated 이벤트를 wedding_id로 거른 뒤 최신 Invitation을 반환. 없으면 null.
 *
 * ⚠️ 위조 가로채기 차단: invitation.move의 create_invitation은 cap 게이트가 없어 누구나 임의 wedding_id로
 *    Invitation을 발행할 수 있다. "최신만" 택하면 제3자가 더 늦게 위조 청첩장을 올려 가로챌 수 있으므로,
 *    **발행자(creator)가 그 결혼식의 주최자(primary_host)인 이벤트만 인정**하고 그 중 최신을 택한다.
 *    (정식 해소는 invitation.move에 WeddingCap/primary_host 게이트 추가 — 컨트랙트 변경 후속.)
 * (queryAllEvents 전역 스캔 한계 동일 — 프로덕션은 전용 인덱서.)
 */
export async function getInvitationForWedding(
  client: SuiJsonRpcClient,
  weddingId: string,
): Promise<InvitationOnChain | null> {
  const wedding = await getWedding(client, weddingId);
  const host = wedding?.hosts[0] ?? null;
  if (!host) return null; // 온체인 Wedding(=주최자)을 못 찾으면 정당성 검증 불가 → 채택 안 함
  const events = await queryAllEvents(client, eventType('invitation', 'InvitationCreated'));
  let latestId: string | null = null;
  for (const e of events) {
    const p = e.parsedJson as Record<string, unknown>;
    if (asString(p.wedding_id) !== weddingId) continue;
    if (asString(p.creator) !== host) continue; // 주최자가 발행한 청첩장만 인정(제3자 위조분 거름)
    latestId = asString(p.invitation_id); // ascending order → 정당 청첩장 중 마지막(최신)
  }
  return latestId ? getInvitation(client, latestId) : null;
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
  const events = await queryAllEvents(client, eventType('ledger', 'ActionLogged'));
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
  const events = await queryAllEvents(client, eventType('event', 'EventCreated'));
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
  const events = await queryAllEvents(client, eventType('event', 'Participated'));
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
  const events = await queryAllEvents(client, eventType('signal', 'SignalEmitted'));
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

// === 유저 발견 (디방인연 카드 소스) ===

export interface MoiCreatedQuery {
  moiId: string;
  owner: string;
}

export async function getMoiCreatedEvents(client: SuiJsonRpcClient): Promise<MoiCreatedQuery[]> {
  const events = await queryAllEvents(client, eventType('moi', 'MoiCreated'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { moiId: asString(p.moi_id), owner: asString(p.owner) };
  });
}

export interface DiscoveredUser {
  address: string;
  moiId: string;
  sharedEventIds: string[];
  mutualCount: number;
  degree: number;
}

/**
 * SignalEmitted(from→to) + Participated(같은 이벤트 참가) 간선으로
 * 양방향 인접 리스트를 만들고, myAddress에서 BFS로 최단 거리(다리 수)를 계산한다.
 */
function buildDegreeMap(
  signals: SignalQuery[],
  participations: ParticipatedQuery[],
  myAddress: string,
): Map<string, number> {
  const adj = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const s of signals) addEdge(s.from, s.to);
  // 같은 이벤트에 참가한 사람끼리도 1다리
  const byEvent = new Map<string, string[]>();
  for (const p of participations) {
    if (!byEvent.has(p.eventId)) byEvent.set(p.eventId, []);
    byEvent.get(p.eventId)!.push(p.participant);
  }
  for (const members of byEvent.values()) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge(members[i]!, members[j]!);
      }
    }
  }
  const dist = new Map<string, number>();
  dist.set(myAddress, 0);
  const bfsQueue: string[] = [myAddress];
  let head = 0;
  while (head < bfsQueue.length) {
    const cur = bfsQueue[head++]!;
    const d = dist.get(cur)!;
    for (const neighbor of adj.get(cur) ?? []) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        bfsQueue.push(neighbor);
      }
    }
  }
  return dist;
}

export async function discoverUsers(
  client: SuiJsonRpcClient,
  myAddress: string,
): Promise<DiscoveredUser[]> {
  const [moiEvents, participations, signals, eventCreated] = await Promise.all([
    getMoiCreatedEvents(client),
    getParticipatedEvents(client),
    getSignalEvents(client),
    getEventCreatedEvents(client),
  ]);
  // WEDDING(eventType=0) 이벤트만 "공유 결혼식"으로 분류 — INYEON(1)은 제외
  const weddingEventIds = new Set(eventCreated.filter((e) => e.eventType === 0).map((e) => e.eventId));
  const degreeMap = buildDegreeMap(signals, participations, myAddress);
  const seen = new Set<string>();
  const others = moiEvents.filter((m) => {
    if (m.owner === myAddress || seen.has(m.owner)) return false;
    seen.add(m.owner);
    return true;
  });
  const myWeddingEventIds = new Set(
    participations.filter((p) => p.participant === myAddress && weddingEventIds.has(p.eventId)).map((p) => p.eventId),
  );
  return others.map((m) => {
    const theirWeddingEventIds = participations
      .filter((p) => p.participant === m.owner && weddingEventIds.has(p.eventId))
      .map((p) => p.eventId);
    const shared = theirWeddingEventIds.filter((eid) => myWeddingEventIds.has(eid));
    const degree = degreeMap.get(m.owner) ?? 6;
    return {
      address: m.owner,
      moiId: m.moiId,
      sharedEventIds: shared,
      mutualCount: shared.length,
      degree,
    };
  });
}

// === 선물(Gift) 이벤트 ===

export interface GiftSentQuery {
  itemId: string;
  itemName: string;
  from: string;
  to: string;
}

export async function getGiftSentEvents(client: SuiJsonRpcClient): Promise<GiftSentQuery[]> {
  const events = await queryAllEvents(client, eventType('gift', 'GiftSent'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { itemId: asString(p.item_id), itemName: asString(p.item_name), from: asString(p.from), to: asString(p.to) };
  });
}

// === 이음 신청 이벤트 (받은이음 소스) ===

export interface IumRequestedQuery {
  eventId: string;
  initiator: string;
  toUser: string;
}

export async function getIumRequestedEvents(client: SuiJsonRpcClient): Promise<IumRequestedQuery[]> {
  const events = await queryAllEvents(client, eventType('ium', 'IumRequested'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { eventId: asString(p.event_id), initiator: asString(p.initiator), toUser: asString(p.to_user) };
  });
}

// === 이음 수락 이벤트 ===

export interface IumAcceptedQuery {
  eventId: string;
  initiator: string;
  receiver: string;
}

export async function getIumAcceptedEvents(client: SuiJsonRpcClient): Promise<IumAcceptedQuery[]> {
  const events = await queryAllEvents(client, eventType('ium', 'IumAccepted'));
  return events.map((e) => {
    const p = e.parsedJson as Record<string, unknown>;
    return { eventId: asString(p.event_id), initiator: asString(p.initiator), receiver: asString(p.receiver) };
  });
}

// === 소유한 IumRequest 조회 (받은 이음 신청의 requestId 확보) ===

export interface OwnedIumRequest {
  requestId: string;
  eventId: string;
  initiator: string;
}

export async function getOwnedIumRequests(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<OwnedIumRequest[]> {
  const objs = await listOwnedByType(client, owner, eventType('ium', 'IumRequest'));
  const out: OwnedIumRequest[] = [];
  for (const res of objs) {
    const f = objectFields(res);
    if (f && res.data) {
      out.push({
        requestId: res.data.objectId,
        eventId: asString(f.event_id),
        initiator: asString(f.initiator),
      });
    }
  }
  return out;
}

// === 쪽지(Note) 이벤트 ===

export interface NoteSentQuery {
  noteBoxId: string;
  from: string;
  to: string;
  blobId: string;
  ts: number;
}

export async function getNoteSentEvents(
  client: SuiJsonRpcClient,
  myAddress: string,
): Promise<NoteSentQuery[]> {
  const events = await queryAllEvents(client, eventType('note', 'NoteSent'));
  return events
    .map((e) => {
      const p = e.parsedJson as Record<string, unknown>;
      return {
        noteBoxId: asString(p.note_box_id),
        from: asString(p.from),
        to: asString(p.to),
        blobId: asString(p.blob_id),
        ts: asNumber(p.created_at_ms),
      };
    })
    .filter((n) => n.from === myAddress || n.to === myAddress);
}
