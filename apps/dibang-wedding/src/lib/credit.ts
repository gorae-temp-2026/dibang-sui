// 신뢰 → 신용 (오프체인 *집계*)
//
// **분류는 온체인이 한다.** "이 액션이 부조/유대다"라는 신호 분류(project·fan-out·방향·자기엣지)는
// contracts/dibang_wedding/sources/signal.move(온체인 SSOT)가 수행하고 SignalEmitted로 발행한다.
// 이 파일은 그 *분류된 Signal*만 입력받아 fold→Φ(전파)→가중합으로 지갑별 신용을 낸다(집계 전담).
// 온체인에 두기 어려운 그래프-단위 연산(wash net 상쇄)·전파(PageRank)·가중치만 여기 남는다.
// 09-credit-propagation PHI-5: 부조=reversed-giving PageRank(net) / CS=authority PageRank / 가중합 0.5·0.3·0.2.

// SignalKind — contracts/dibang_wedding/sources/signal.move 와 일치(u8).
export const KIND = { NONE: 0, BUSU: 1, CS: 2 } as const

// 신호 출처(원천 action) — signal.move 미러. 신뢰 신호의 *행위별* 분해(L1 raw)에 쓴다.
export const SOURCE = { GIVE_MONEY: 0, ACCEPT_IUM: 2, GIFT: 3, WRITE_MESSAGE: 4, ATTEND: 5, INVITE: 6 } as const

const DAMPING = 0.85
const ITERS = 60
const W_BUSU = 0.5
const W_CS = 0.3
const W_PERF = 0.2
const PERF_NO_RECORD = 0.7

/** 온체인에서 분류·발행된 신호(signal::SignalEmitted 미러). credit의 유일 입력 — 분류는 이미 끝났다. */
export interface SignalEvent {
  kind: number
  /** 자원 식별(EM 돈=0, CS=0). (kind, resource_id) = 온체인 TrustMatrix 타입 키 미러. signal.move 결정#43. 옵셔널: 구 이벤트 호환. */
  resource_id?: number
  /** 원천 행위(action_type / 참석=5 / 매칭=2). 행위별 CS 차등 가중의 재료 — 분류가 출처를 버리지 않게 보존. 현재는 평탄 적용(가중 튜닝 후행). */
  source: number
  from: string
  to: string
  /** EM=금액(MIST), CS=1. 부조 MIST는 이 도메인에서 2^53 훨씬 아래라 number로 정확(초대형 부조 시 재검토). */
  magnitude: number
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
 * 부조 그래프를 *net*으로 변환 — 상호 엣지 상쇄(net[A][B] = max(0, give[A][B] − give[B][A])).
 * 07 EM 아벨군(net=give−recv) 정합 + A↔B wash(순환 부조)를 0으로(시빌 방어, §8 b). 그래프-단위라 온체인 분류로
 * 못 하고 여기(집계) 잔류.
 */
function netGiveGraph(give: Graph): Graph {
  const net: Graph = new Map()
  for (const [a, m] of give) {
    for (const [b, amt] of m) {
      const reverse = give.get(b)?.get(a) ?? 0
      const n = amt - reverse
      if (n > 0) addEdge(net, a, b, n)
    }
  }
  return net
}

/**
 * 부조 신용 = reversed-giving PageRank (PHI-5). 베푼 쪽이 적립, 상대 신용으로 가중되는 재귀 전파.
 * recv[h] = Σ_g give[g][h]; π_g = (1−d)/N + d·Σ_h (give[g][h]/recv[h])·π_h. 입력은 net give 그래프.
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
 * CS 신용 = authority PageRank (PHI-5 정식). 유대받는 쪽이 적립하되 높은 신뢰 노드에게 받을수록 더 높다.
 * π_b = (1−d)/N + d·Σ_a (tie[a][b]/out[a])·π_a (out[a] = a의 총 유대).
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
 * 온체인 Signal들을 부조(EM) / 유대(CS) 그래프로 접는다. **분류는 이미 온체인서 끝남** — kind로 분기만.
 * (fan-out·방향·자기엣지 필터는 signal.move가 했음. 여기선 자기엣지는 방어적으로 한 번 더 스킵.)
 */
function fold(signals: SignalEvent[]): { busu: Graph; cs: Graph; nodes: Set<string> } {
  const busu: Graph = new Map()
  const cs: Graph = new Map()
  const nodes = new Set<string>()
  for (const s of signals) {
    nodes.add(s.from)
    nodes.add(s.to)
    if (s.from === s.to) continue // 온체인서 이미 걸러지나 방어
    if (s.kind === KIND.BUSU) addEdge(busu, s.from, s.to, s.magnitude)
    else if (s.kind === KIND.CS) addEdge(cs, s.from, s.to, s.magnitude)
  }
  return { busu, cs, nodes }
}

/**
 * 온체인 분류 신호 → 지갑별 신용. (신뢰 → 신용; 집계 전담)
 * 부조 standing·CS는 teleport 기준선 초과분으로 0~1화(비-기여자=0, 전원-만점 퇴화 방지).
 */
export function creditFromSignals(signals: SignalEvent[]): CreditResult {
  const { busu, cs, nodes } = fold(signals)
  const nodeList = [...nodes]
  const baseline = nodeList.length > 0 ? (1 - DAMPING) / nodeList.length : 0

  // net 전파(wash 상쇄 + 07 EM 아벨군) 후 reversed-giving.
  const busuRaw = reversedGivingPageRank(netGiveGraph(busu), nodeList)
  const busuExcess: Record<string, number> = {}
  for (const n of nodeList) busuExcess[n] = Math.max(0, (busuRaw[n] ?? 0) - baseline)
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
    const p = PERF_NO_RECORD // ⚠️ SCOPE: 이행(perf)=대여-상환=DeFi 다운스트림 영역(이 substrate scope 밖, #12) → 무기록 0.7 고정(미완 아님)
    credit[n] = W_BUSU * b + W_CS * c + W_PERF * p
    components[n] = { busu: b, cs: c, perf: p }
  }
  return { credit, components }
}

/** 한 지갑이 *받은* 신호의 행위별 분해(신용 설명용 L1 raw). 분류 SSOT는 온체인 source(실제 분류). */
export interface SignalBreakdown {
  부조: number
  방명록: number
  초대: number
  선물: number
  참석: number
  매칭: number
  total: number
}

/** 온체인 분류 신호 → address가 받은 신호의 행위별 카운트. UI(MoiCreditPanel 등) 신용 근거 표시용. */
export function signalBreakdownFor(signals: SignalEvent[], address: string): SignalBreakdown {
  const b: SignalBreakdown = { 부조: 0, 방명록: 0, 초대: 0, 선물: 0, 참석: 0, 매칭: 0, total: 0 }
  for (const s of signals) {
    if (s.to !== address) continue
    switch (s.source) {
      case SOURCE.GIVE_MONEY: b.부조++; break
      case SOURCE.WRITE_MESSAGE: b.방명록++; break
      case SOURCE.INVITE: b.초대++; break
      case SOURCE.GIFT: b.선물++; break
      case SOURCE.ATTEND: b.참석++; break
      case SOURCE.ACCEPT_IUM: b.매칭++; break
      default: continue
    }
    b.total++
  }
  return b
}
