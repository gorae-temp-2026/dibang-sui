// 페르소나별 공유 프로필 — 결정적 생성기(시드 RNG). 인연 a~g + 광장 하객이 각자 다른
// Moi Credit·① 인연 연결 그래프·② signal·익명 신뢰범위를 갖게 한다. (철수 본인만 실제 sim
// 산출 = chulsooProfile.) ★데모 일관성: 같은 인물은 인연·광장 어디서 클릭해도 동일 프로필
// (personaId 기준). 산출 수치는 sim 본계산이 아닌 그럴듯한 대표 샘플(데모 프레이밍 동일).
//
// ★광장 ego 네트워크: plazaPartnerIds(spriteId) = 광장 선과 프로필 ① 인연-연결을 도출하는
//  단일 소스. 철수=실제 만난 tier0 hero, 그 외=시드 결정적 광장 실재 스프라이트 2~5명.
//  프로필 그래프도 같은 함수로 생성 → "광장 선 = 프로필 그래프 ∩ 광장" (모순 없음).
import type { ProfileData, ProfileNode, ProfileLink, SignalNode } from './types'
import type { Moi } from '../inyeon/types'
import { POOL } from '../inyeon/data'
import { PLAZA_CROWD, CROWD_BY_ID } from '../moi-gather/data'
import { chulsooProfile } from './fixture'

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

// pixi hex → hue(0~360) — 그래프 노드 색(모이 대표색과 통일).
function hueOf(hex: number): number {
  const r = ((hex >> 16) & 255) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 210
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return Math.round((h * 60 + 360) % 360)
}

// 점수 → 티어/라벨 (834=AAA인 철수와 정합되게 임계 정렬).
function tierOf(score: number): string {
  return score >= 820 ? 'AAA' : score >= 760 ? 'AA' : score >= 690 ? 'A' : score >= 620 ? 'BBB' : score >= 550 ? 'BB' : 'B'
}
function labelOf(score: number): string {
  return score >= 820 ? '상위 추정' : score >= 760 ? '매우 높음' : score >= 690 ? '높음' : score >= 620 ? '보통' : '안정권'
}

// 프로필 전용(광장엔 없는) 추가 이웃 라벨 — 선 생략 케이스 시연 + 그래프 풍부화.
const EXTRA_NAMES = ['선배', '동기', '사촌', '친구', '동료', '이웃', '지인']

// ── 광장 ego 네트워크 단일 소스 ──
let _heroIds: string[] | null = null
// 철수가 실제로 만난 사람 = 광장의 tier0 페르소나 hero(서아·하늘·하린).
function heroIds(): string[] {
  if (!_heroIds) {
    _heroIds = PLAZA_CROWD.filter((m) => m.personaId != null && POOL.find((p) => p.id === m.personaId)?.tier === 0).map((m) => m.id)
  }
  return _heroIds
}
// 광장 실재 스프라이트 중 결정적 셔플로 count명(자기·철수 제외).
function pickFromCrowd(seed: number, selfId: string, count: number): string[] {
  const pool = PLAZA_CROWD.filter((m) => m.id !== selfId && m.id !== 'me').map((m) => m.id)
  const r = rng(seed)
  const idx = pool.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = idx[i]
    idx[i] = idx[j]
    idx[j] = t
  }
  return idx.slice(0, Math.min(count, pool.length)).map((i) => pool[i])
}
// 시드 도출: 페르소나=POOL id 기반(인연·광장 동일), 게스트=스프라이트 id 해시.
function seedFor(spriteId: string): number {
  const cm = CROWD_BY_ID[spriteId]
  if (cm?.personaId != null) return 1000 + cm.personaId
  // CROWD에 없는 페르소나(tier1·2, 광장 밖)도 안정 시드.
  const pm = spriteId.startsWith('persona-') ? Number(spriteId.slice(8)) : NaN
  return Number.isFinite(pm) ? 1000 + pm : hashId(spriteId)
}
/** 광장 ego — spriteId가 광장에서 이어진 상대 스프라이트 id 목록(선·그래프 공통 소스). */
export function plazaPartnerIds(spriteId: string): string[] {
  if (spriteId === 'me') return heroIds()
  const seed = seedFor(spriteId)
  const count = 2 + (seed % 4) // 2~5
  return pickFromCrowd(seed ^ 0x5bd1e995, spriteId, count)
}

export interface ProfileSeed {
  subject: string
  /** 목표 Moi Credit 0~1000. */
  score: number
  /** 0(연결자·CS중심) ~ 1(증여자·EM중심). */
  giving: number
  /** ① 그래프 이웃 = 광장 스프라이트 id(plazaPartnerIds). 라벨/hue는 CROWD에서 해석. */
  neighborIds?: string[]
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

  // ── ① 인연 연결 그래프: self + 광장 이웃(선 대상) + 프로필 전용 추가 노드. ──
  const relPool = o.giving > 0.5 ? ['부조', '선물', '이음', '대화', '이음'] : ['이음', '대화', '이음', '승급', '부조']
  const nodes: ProfileNode[] = [{ id: o.subject, label: o.subject, hue: o.selfHue ?? Math.floor(r() * 360), self: true }]
  const links: ProfileLink[] = []
  const neigh = (o.neighborIds ?? []).map((pid) => {
    const cm = CROWD_BY_ID[pid]
    return { id: pid, label: cm?.name ?? '모이', hue: cm ? hueOf(cm.color) : Math.floor(r() * 360) }
  })
  neigh.forEach((nd) => {
    nodes.push(nd)
    links.push({ source: o.subject, target: nd.id, type: relPool[Math.floor(r() * relPool.length)], value: 1 + Math.floor(r() * 3) })
  })
  // 프로필 전용(광장엔 없는) 노드 2개 — 광장 선 생략 대상.
  for (let i = 0; i < 2; i++) {
    const id = `x_${seed}_${i}`
    nodes.push({ id, label: EXTRA_NAMES[(seed + i * 3) % EXTRA_NAMES.length], hue: Math.floor(r() * 360) })
    links.push({ source: o.subject, target: id, type: relPool[Math.floor(r() * relPool.length)], value: 1 + Math.floor(r() * 2) })
  }
  // 이웃 간 약한 교차(군집감) — 광장 노드끼리만.
  if (neigh.length >= 2) links.push({ source: neigh[0].id, target: neigh[neigh.length - 1].id, type: '이음', value: 1 })

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
    giving: m.tier === 0 ? 0.62 : m.tier === 1 ? 0.48 : 0.4,
    neighborIds: plazaPartnerIds(`persona-${m.id}`),
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
    giving: r(),
    neighborIds: plazaPartnerIds(id),
    selfHue: hue,
  })
}

// 철수 광장용 프로필 — 실데이터(chulsooProfile)에 광장 hero(서아·하늘·하린)만 그래프 노드로
// 추가(점수·trace·signal 불변). 광장 선(hero)과 프로필 ① 인연-연결이 일치하게. 기존 sim 이웃은
// "프로필엔 있고 광장엔 없는" 노드로 남아 선 생략 케이스를 자연 시연.
function buildChulsooPlaza(): ProfileData {
  const base = chulsooProfile
  const selfNodeId = base.graph.nodes[0]?.id ?? base.subject
  const have = new Set(base.graph.nodes.map((n) => n.id))
  const addNodes: ProfileNode[] = []
  const addLinks: ProfileLink[] = []
  heroIds().forEach((hid) => {
    const cm = CROWD_BY_ID[hid]
    if (!cm || have.has(hid)) return
    addNodes.push({ id: hid, label: cm.name, hue: hueOf(cm.color) })
    addLinks.push({ source: selfNodeId, target: hid, type: '승급', value: 3 }) // 오프라인 이음(승급)
  })
  return { ...base, graph: { nodes: [...base.graph.nodes, ...addNodes], links: [...base.graph.links, ...addLinks] } }
}
export const chulsooPlazaProfile: ProfileData = buildChulsooPlaza()
