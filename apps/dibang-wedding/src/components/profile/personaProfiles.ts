// 페르소나별 공유 프로필 — 결정적 생성기(시드 RNG). 인연 a~g + 광장 하객이 각자 다른
// Moi Credit·① 인연 연결 그래프·② signal·익명 신뢰범위를 갖게 한다. (철수 본인만 실제 sim
// 산출 = chulsooProfile.) ★데모 일관성: 같은 인물은 인연·광장 어디서 클릭해도 동일 프로필
// (personaId 기준). 산출 수치는 sim 본계산이 아닌 그럴듯한 대표 샘플(데모 프레이밍 동일).
import type { ProfileData, ProfileNode, ProfileLink, SignalNode } from './types'
import type { Moi } from '../inyeon/types'
import { POOL } from '../inyeon/data'

// 결정적 RNG(LCG) — 시드 같으면 항상 동일 산출(렌더 안정 + force-graph 재시뮬 방지).
function rng(seed: number) {
  let s = (seed >>> 0) || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}
// 문자열 id → 정수 시드 (FNV-1a).
export function hashId(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const round1 = (v: number) => Math.round(v * 10) / 10

// 점수 → 티어/라벨 (834=AAA인 철수와 정합되게 임계 정렬).
function tierOf(score: number): string {
  return score >= 820 ? 'AAA' : score >= 760 ? 'AA' : score >= 690 ? 'A' : score >= 620 ? 'BBB' : score >= 550 ? 'BB' : 'B'
}
function labelOf(score: number): string {
  return score >= 820 ? '상위 추정' : score >= 760 ? '매우 높음' : score >= 690 ? '높음' : score >= 620 ? '보통' : '안정권'
}

// 그래프 이웃 라벨 풀(가독용 — 익명 컨텍스트에선 hover로만 보임).
const NEIGHBORS = ['하준', '서윤', '지호', '수아', '민서', '도윤', '지안', '하린', '예준', '시우', '은우', '유진', '다은', '준우', '서아', '지우', '민준', '채원', '하은', '지윤', '준서', '소율', '시윤', '하람']

export interface ProfileSeed {
  subject: string
  /** 목표 Moi Credit 0~1000. */
  score: number
  /** ① 그래프 이웃 수(자기 제외). */
  netSize: number
  /** 0(연결자·CS중심) ~ 1(증여자·EM중심). */
  giving: number
  /** 신뢰범위 라벨(미지정 시 score에서 도출). */
  trustLabel?: string
  /** self 노드 hue. */
  selfHue?: number
}

function build(seed: number, o: ProfileSeed): ProfileData {
  const r = rng(seed)
  const score = Math.round(clamp(o.score, 520, 950))
  const tier = tierOf(score)
  const total = 300
  const rank = clamp(Math.round((1 - score / 1000) * 300 + (r() - 0.5) * 24), 2, 298)

  // ── ① 인연 연결 그래프: self + 이웃 별모양 + 이웃끼리 약간의 교차(군집감). ──
  const n = clamp(Math.round(o.netSize), 4, 18)
  const nodes: ProfileNode[] = [{ id: o.subject, label: o.subject, hue: o.selfHue ?? Math.floor(r() * 360), self: true }]
  const links: ProfileLink[] = []
  const relPool = o.giving > 0.5 ? ['부조', '선물', '이음', '대화', '이음'] : ['이음', '대화', '이음', '승급', '부조']
  for (let i = 0; i < n; i++) {
    const id = `${seed}_${i}`
    nodes.push({ id, label: NEIGHBORS[(seed + i * 7) % NEIGHBORS.length], hue: Math.floor(r() * 360) })
    links.push({ source: o.subject, target: id, type: relPool[Math.floor(r() * relPool.length)], value: 1 + Math.floor(r() * 3) })
  }
  const cross = Math.floor(n * 0.25)
  for (let i = 0; i < cross; i++) {
    const a = 1 + Math.floor(r() * n)
    const b = 1 + Math.floor(r() * n)
    if (a !== b) links.push({ source: nodes[a].id, target: nodes[b].id, type: '이음', value: 1 })
  }

  // ── ② signal(2층 fold) — score·giving에 비례. EM=증여자 / CS=연결자. ──
  const mag = score / 100
  const g = o.giving
  const em부조 = round1(mag * (1.2 + g * 2.2))
  const em선물 = round1(mag * (0.5 + g * 1.1))
  const cs이음 = round1(mag * (1.0 + (1 - g) * 1.8))
  const cs대화 = round1(mag * (0.4 + (1 - g) * 0.8))
  const cs참석 = round1(mag * 0.5)
  const signal: SignalNode = {
    name: '우리',
    children: [
      { name: 'EM', children: [{ name: '부조', value: em부조 }, { name: '선물', value: em선물 }] },
      { name: 'CS', children: [{ name: '참석', value: cs참석 }, { name: '이음', value: cs이음 }, { name: '대화', value: cs대화 }, { name: '모임', value: 0 }] },
      { name: 'AR', children: [{ name: '관계', value: round1(mag * 0.18), stub: true }] },
      { name: 'MP', children: [{ name: '거래', value: 0.2, stub: true }] },
    ],
  }

  // ── trace(raw→층→공식) — 패널 텍스트용, score와 정합. ──
  const raw부조 = Math.max(1, Math.round(em부조 / 5))
  const raw이음 = Math.round(cs이음 * 5)
  const raw대화 = Math.round(cs대화 * 6)
  const raw선물 = Math.max(1, Math.round(em선물 / 0.7))
  const phi부조 = clamp(round1(0.55 + g * 0.4 + (r() - 0.5) * 0.06), 0, 1)
  const phiCS = clamp(round1(0.4 + (1 - g) * 0.4 + (r() - 0.5) * 0.06), 0, 1)
  const trace = {
    L1_raw: { 부조: raw부조, 이음: raw이음, 대화: raw대화, 선물: raw선물, total: raw부조 + raw이음 + raw대화 + raw선물 },
    L2_fold: { 부조EM: Math.round(em부조), 증여EM: Math.round(em선물), topTies: [] as { p: string; t: number }[] },
    L3_phi: { 부조: phi부조, CS: phiCS, 이행: 1, op: 'reversed-giving PageRank / authority / node, d=0.85' },
    L4_integrate: { W: { 부조: 0.5, cs: 0.3, 이행: 0.2 }, formula: '0.5·부조 + 0.3·CS + 0.2·이행', value: round1(score / 1000) },
  }

  return {
    subject: o.subject,
    asOf: 'now',
    moiCredit: { value: score / 1000, score, tier, rank, total, onchain: true },
    trace,
    graph: { nodes, links },
    signal,
    trustRange: { tier, label: o.trustLabel ?? labelOf(score), anon: true },
  }
}

// 캐시 — 같은 키는 동일 객체 참조 반환(InyeonGraph useMemo[data] 재시뮬 방지·렌더 안정).
const cache = new Map<string, ProfileData>()
function cached(key: string, seed: number, o: ProfileSeed): ProfileData {
  let p = cache.get(key)
  if (!p) {
    p = build(seed, o)
    cache.set(key, p)
  }
  return p
}

// 인연 페르소나 점수 — 카드 속성(신뢰막대·이음수·관계거리)에서 일관 도출.
function personaScore(m: Moi): number {
  return Math.round(560 + m.barsF * 50 + (m.net - 17) * 2.2 - m.tier * 24)
}

/** 인연 페르소나(POOL 모이) → 공유 프로필. 인연·광장 공통(동일 인물 = 동일 프로필). */
export function profileForPersona(m: Moi): ProfileData {
  return cached(`p${m.id}`, 1000 + m.id, {
    subject: m.name,
    score: personaScore(m),
    netSize: 6 + Math.round((m.net - 17) / 3.2),
    giving: m.tier === 0 ? 0.62 : m.tier === 1 ? 0.48 : 0.4,
    trustLabel: m.balLabel,
    selfHue: m.photos[0]?.hue,
  })
}

/** personaId(POOL id)로 프로필 조회 — 광장 hero 모이용. */
export function profileForPersonaId(id: number): ProfileData {
  const m = POOL.find((p) => p.id === id)
  return m ? profileForPersona(m) : makeGuestProfile(`persona-${id}`, '모이', 210)
}

/** 광장 익명 하객 → 생성 프로필(id 시드 기반, 각자 다름). */
export function makeGuestProfile(id: string, subject: string, hue: number): ProfileData {
  const seed = hashId(id)
  const r = rng(seed)
  return cached(`g${id}`, seed, {
    subject,
    score: Math.round(600 + r() * 250),
    netSize: 5 + Math.floor(r() * 9),
    giving: r(),
    selfHue: hue,
  })
}
