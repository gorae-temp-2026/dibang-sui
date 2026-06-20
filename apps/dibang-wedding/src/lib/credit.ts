// 신뢰 → 신용 (오프체인 크레딧 리더)
//
// 온체인 raw 이벤트(dibang_wedding::ledger `ActionLogged` + ::event `EventCreated`)를 읽어
// 지갑별 신용 점수를 계산한다. 설계(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION 결정#12):
// - 신용 계산은 **오프체인**. 온체인은 raw 액션만. 해석(부조/EM/CS)·전파 비중은 *여기*에 산다(온체인에 안 박음).
// - 파이프라인: raw 액션 → project(해석 규칙) → fold(EM 부조 give[g][h] / CS tie[a][b]) → Φ(전파) → 가중합.
// - Φ = 09-credit-propagation PHI-5: **부조 = reversed-giving PageRank**(베푼 쪽이 적립, 상대 신용으로 가중),
//   **CS = authority PageRank**(유대받는 쪽 적립, 고신뢰자에게 받을수록↑ — 유대의 질 반영), 이행 = 데이터 없으면 0.7.
// - 가중합(doc 09): 최종 = 0.5·부조 + 0.3·CS + 0.2·이행. (first-cut 임의값 — 실데이터로 튜닝.)
// - 증여(GIFT) EM은 부조 전파에서 제외(MOICREDIT_AUDIT: sole-giver 농사 방지) → CS로만 집계.

// action_type — contracts/dibang_wedding/sources/ledger.move 와 일치(u8).
export const ACTION = {
  GIVE_MONEY: 0,
  REQUEST_IUM: 1,
  ACCEPT_IUM: 2,
  GIFT: 3,
  WRITE_MESSAGE: 4,
  ATTEND: 5,
  INVITE: 6,
} as const

// event_type — ::event 와 일치.
export const EVENT = { WEDDING: 0, INYEON: 1 } as const
// role_id — ::event 와 일치.
export const ROLE = { HOST: 0, GUEST: 1, OFFICIANT: 2, INITIATOR: 3, RECEIVER: 4 } as const

const DAMPING = 0.85
const ITERS = 60
const W_BUSU = 0.5
const W_CS = 0.3
const W_PERF = 0.2
const PERF_NO_RECORD = 0.7

/** ledger::ActionLogged 이벤트(온체인 필드 미러). amount 등은 number로 파싱된 것으로 가정. */
export interface ActionLoggedEvent {
  eventId: string
  actionType: number
  actor: string
  target: string | null
  roleId: number
  amount: number
  ts: number
}

/** event::EventCreated 이벤트(event_id → event_type 해석 + creator). */
export interface EventCreatedEvent {
  eventId: string
  eventType: number
  /** 이벤트 생성자(웨딩=혼주). 참석(Participation)의 CS 대상. */
  creator: string
}

/** event::Participated 이벤트 — 참가(역할). 참석 = CS '함께함' 신호의 원천(참가=출석). */
export interface ParticipatedEvent {
  eventId: string
  participant: string
  roleId: number
}

export interface CreditResult {
  /** 지갑별 최종 신용(0~1). */
  credit: Record<string, number>
  /** 구성요소(설명·디버그용). */
  components: Record<string, { busu: number; cs: number; perf: number }>
}

type Graph = Map<string, Map<string, number>> // from -> to -> weight

function addEdge(g: Graph, from: string, to: string, w: number) {
  let m = g.get(from)
  if (!m) {
    m = new Map()
    g.set(from, m)
  }
  m.set(to, (m.get(to) ?? 0) + w)
}

/**
 * project + fold — raw 액션을 EM 부조 그래프와 CS 유대 그래프로 접는다.
 * 해석 규칙(action_type × event_type × role):
 * - GIVE_MONEY @ WEDDING (하객 GUEST → 혼주) = 부조(EM): give[actor][target] += amount.
 * - WRITE_MESSAGE / INVITE / ACCEPT_IUM / GIFT = 유대(CS): tie[actor][target] += 1. (GIFT EM은 부조 제외)
 * - REQUEST_IUM(대기)·ATTEND(미로깅: Participation으로 표현)·target 없는 건 무신호.
 */
function fold(
  actions: ActionLoggedEvent[],
  events: EventCreatedEvent[],
  participated: ParticipatedEvent[],
): { busu: Graph; cs: Graph; nodes: Set<string> } {
  const eventType = new Map(events.map((e) => [e.eventId, e.eventType]))
  const eventCreator = new Map(events.map((e) => [e.eventId, e.creator]))
  const busu: Graph = new Map()
  const cs: Graph = new Map()
  const nodes = new Set<string>()

  for (const a of actions) {
    nodes.add(a.actor)
    if (a.target) nodes.add(a.target)
    // 대상 없음 / 자기엣지(actor==target = 자기거래 농사) 제외 — §8 V4 "자기통제 target은 Φ에서 필터".
    if (!a.target || a.actor === a.target) continue

    const et = eventType.get(a.eventId)
    switch (a.actionType) {
      case ACTION.GIVE_MONEY:
        // 부조 = 결혼식의 하객→혼주 EM. 그 외 맥락(거래 등)은 first-cut 제외.
        if (et === EVENT.WEDDING && a.roleId === ROLE.GUEST && a.amount > 0) {
          addEdge(busu, a.actor, a.target, a.amount)
        }
        break
      case ACTION.WRITE_MESSAGE:
      case ACTION.INVITE:
      case ACTION.ACCEPT_IUM:
      case ACTION.GIFT:
        // 유대 신호(방향별 누적). 증여(GIFT)도 CS로만(EM 부조 전파 제외).
        addEdge(cs, a.actor, a.target, 1)
        break
      default:
        break // REQUEST_IUM 등
    }
  }

  // 참석(Participation) = CS '함께함' 신호(I1). 참가자 → 이벤트 생성자(웨딩=혼주). 자기 이벤트(혼주 본인)는 제외.
  // (참석은 ActionLogged ATTEND가 아니라 Participated가 원천 — participate가 곧 출석.)
  for (const p of participated) {
    nodes.add(p.participant)
    const creator = eventCreator.get(p.eventId)
    if (!creator) continue
    nodes.add(creator)
    if (p.participant === creator) continue
    addEdge(cs, p.participant, creator, 1)
  }

  return { busu, cs, nodes }
}

/**
 * 부조 신용 = reversed-giving PageRank (PHI-5).
 * recv[h] = Σ_g give[g][h]; π_g = (1−d)/N + d·Σ_h (give[g][h]/recv[h])·π_h.
 * "베푼 쪽이 적립, 상대(받은 쪽)의 신용으로 가중되는 재귀 전파" — 받는 행위는 신용을 안 올린다.
 */
function reversedGivingPageRank(give: Graph, nodes: string[]): Record<string, number> {
  const N = nodes.length
  if (N === 0) return {}
  const recv: Record<string, number> = {}
  for (const [, m] of give) for (const [h, amt] of m) recv[h] = (recv[h] ?? 0) + amt

  let pi: Record<string, number> = {}
  for (const n of nodes) pi[n] = 1 / N
  for (let it = 0; it < ITERS; it++) {
    const next: Record<string, number> = {}
    for (const g of nodes) {
      let s = 0
      const m = give.get(g)
      if (m)
        for (const [h, amt] of m) {
          const r = recv[h] ?? 0
          if (r > 0) s += (amt / r) * (pi[h] ?? 0)
        }
      next[g] = (1 - DAMPING) / N + DAMPING * s
    }
    pi = next
  }
  return pi
}

/**
 * CS 신용 = authority PageRank (PHI-5 정식). 유대받는 쪽이 적립하되, **높은 신뢰 노드에게 유대받을수록 더 높다**.
 * π_b = (1−d)/N + d·Σ_a (tie[a][b]/out[a])·π_a (out[a] = a의 총 유대). flat in-tie와 달리 유대의 *질*(중심성)을 반영.
 */
function authorityPageRank(g: Graph, nodes: string[]): Record<string, number> {
  const N = nodes.length
  if (N === 0) return {}
  const out: Record<string, number> = {}
  for (const [a, m] of g) for (const [, w] of m) out[a] = (out[a] ?? 0) + w

  let pi: Record<string, number> = {}
  for (const n of nodes) pi[n] = 1 / N
  for (let it = 0; it < ITERS; it++) {
    const next: Record<string, number> = {}
    for (const n of nodes) next[n] = (1 - DAMPING) / N
    for (const [a, m] of g) {
      const oa = out[a] ?? 0
      if (oa > 0) for (const [b, w] of m) next[b] = (next[b] ?? 0) + DAMPING * (w / oa) * (pi[a] ?? 0)
    }
    pi = next
  }
  return pi
}

/** 0~1 정규화(최댓값 기준). 전부 0이면 0. */
function normalize(scores: Record<string, number>, nodes: string[]): Record<string, number> {
  let max = 0
  for (const n of nodes) max = Math.max(max, scores[n] ?? 0)
  const out: Record<string, number> = {}
  for (const n of nodes) out[n] = max > 0 ? (scores[n] ?? 0) / max : 0
  return out
}

/**
 * 온체인 raw 이벤트 → 지갑별 신용. (신뢰 → 신용)
 * decision#12: 오프체인 계산. 결정값(비중·이행 기본치)은 여기(튜닝 대상)에만 있다.
 */
export function creditFromEvents(
  actions: ActionLoggedEvent[],
  events: EventCreatedEvent[],
  participated: ParticipatedEvent[] = [],
): CreditResult {
  const { busu, cs, nodes } = fold(actions, events, participated)
  const nodeList = [...nodes]

  const busuRaw = reversedGivingPageRank(busu, nodeList)
  // 부조 standing = teleport 기준선((1−d)/N) 위로 전파된 *초과분*(베푼 활동이 만든 기여). 비-기여자(안 베푼
  // 사람)는 기준선에 머물러 초과분 0 → 부조 신용 0. (기준선까지 정규화하면 '아무도 안 베푼 그래프'에서
  // 전원이 만점이 되는 퇴화를 막는다. PageRank는 그대로, 표현만 초과분 기준.)
  const baseline = nodeList.length > 0 ? (1 - DAMPING) / nodeList.length : 0
  const busuExcess: Record<string, number> = {}
  for (const n of nodeList) busuExcess[n] = Math.max(0, (busuRaw[n] ?? 0) - baseline)
  // CS도 부조와 동일하게 기준선 초과분으로(유대 없는 노드 = CS 0, 전원-만점 퇴화 방지).
  const csRaw = authorityPageRank(cs, nodeList)
  const csExcess: Record<string, number> = {}
  for (const n of nodeList) csExcess[n] = Math.max(0, (csRaw[n] ?? 0) - baseline)
  const busuN = normalize(busuExcess, nodeList)
  const csN = normalize(csExcess, nodeList)

  const credit: Record<string, number> = {}
  const components: Record<string, { busu: number; cs: number; perf: number }> = {}
  for (const n of nodeList) {
    const b = busuN[n] ?? 0
    const c = csN[n] ?? 0
    const p = PERF_NO_RECORD // 이행 데이터(대여 상환/default) 미수집 → 무기록 기본치
    credit[n] = W_BUSU * b + W_CS * c + W_PERF * p
    components[n] = { busu: b, cs: c, perf: p }
  }
  return { credit, components }
}
