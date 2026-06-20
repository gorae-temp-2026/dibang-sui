// 모이가모인곳(④) 광장(plaza) 데모 데이터 — 군중 + 테마 데코 세트 + 샵 카탈로그.
// ★개념: 45° 부감의 넓은 광장(150~300 모이 = 라운지 시각화), 작은 방 아님(핸드오프 §3 정정).
// 데코 = 테마 스왑 레이어(결혼식 기본 / 파티·클럽 구조). 아트 = 손그림 톤 PNG로 슬롯 교체 예정.
// 카탈로그 SSOT = `미니룸_에셋스펙_AI프롬프트_260620.md` §2(옷) — 가구는 '광장 데코'로 리프레임.

export type ShopCategory = 'decor' | 'outfit'
export type EquipSlot = 'head' | 'body'

export interface ShopItem {
  /** 에셋키 — placeholder→손그림 PNG 슬롯 교체 키. */
  id: string
  name: string
  category: ShopCategory
  /** 구매 요네 (1회 차감). */
  yone: number
  desc: string
  emoji: string
  /** placeholder 색 (PNG 교체 전 도형 채움, pixi hex). */
  color: number
  signature?: boolean
  // ─ decor(광장 데코) 전용 ─
  size?: 'sm' | 'md' | 'lg'
  // ─ outfit(옷·액세서리) 전용 ─
  slot?: EquipSlot
}

// 샵 카탈로그 — 광장에 배치하는 데코 + 내 모이 옷(에셋스펙 §2).
export const SHOP: ShopItem[] = [
  { id: 'fountain', name: '분수', category: 'decor', yone: 120, desc: '광장 중앙 시그니처', emoji: '⛲', color: 0x6fb7d6, size: 'lg', signature: true },
  { id: 'bench', name: '나무 벤치', category: 'decor', yone: 40, desc: '광장에 놓는 벤치', emoji: '🪑', color: 0xb98a5e, size: 'md' },
  { id: 'pot', name: '꽃 화분', category: 'decor', yone: 15, desc: '광장 곳곳 소형 화분', emoji: '🪴', color: 0x7fae6b, size: 'sm' },
  { id: 'wreath', name: '디지털 화환', category: 'decor', yone: 80, desc: '디방화환 연계', emoji: '💐', color: 0xe39bb0, size: 'md' },
  { id: 'giftbox', name: '선물 박스', category: 'decor', yone: 25, desc: '들러리선물 연계', emoji: '🎁', color: 0xe0a85f, size: 'sm' },
  { id: 'ribbon', name: '리본 헤어밴드', category: 'outfit', yone: 12, desc: '머리 위 작은 포인트', emoji: '🎀', color: 0xe88aa6, slot: 'head' },
  { id: 'casual', name: '캐주얼', category: 'outfit', yone: 30, desc: '편한 후드·진 차림', emoji: '👕', color: 0x6f9bd0, slot: 'body' },
  { id: 'suit', name: '정장', category: 'outfit', yone: 50, desc: '단정한 정장 한 벌', emoji: '🤵', color: 0x3a4a66, slot: 'body' },
  { id: 'hanbok', name: '한복', category: 'outfit', yone: 90, desc: '고운 전통 한복 · 시그니처', emoji: '👘', color: 0xd96f86, slot: 'body', signature: true },
]

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP.map((it) => [it.id, it]))

export const START_YONE_PLAZA = 300
export const CHARGE_AMOUNT = 100

// ─ 테마 데코 세트 (스왑 레이어) ─
export type PlazaTheme = 'wedding' | 'party' | 'club'
export type DecorShape = 'box' | 'round' | 'aisle' | 'arch'

/** 광장 바닥 위에 깔리는 고정 데코(테마 베이스). 좌표 = 광장 정규화 0~1. */
export interface DecorItem {
  id: string
  kind: string
  x: number
  y: number
  /** 폭(광장 px). */
  w: number
  color: number
  emoji: string
  shape: DecorShape
}

// 결혼식 = 데모 광장(채움) / 파티·클럽 = 구조만(스왑 가능 증명).
export const DECOR_SETS: Record<PlazaTheme, DecorItem[]> = {
  wedding: [
    { id: 'aisle', kind: '버진로드', x: 0.5, y: 0.52, w: 150, color: 0xf3e6ec, emoji: '', shape: 'aisle' },
    { id: 'arch', kind: '꽃아치', x: 0.5, y: 0.15, w: 260, color: 0xe7b6c6, emoji: '💒', shape: 'arch' },
    { id: 'fountain', kind: '분수', x: 0.2, y: 0.26, w: 120, color: 0x6fb7d6, emoji: '⛲', shape: 'round' },
    { id: 'pot-l', kind: '화분', x: 0.1, y: 0.46, w: 64, color: 0x7fae6b, emoji: '🪴', shape: 'box' },
    { id: 'pot-r', kind: '화분', x: 0.9, y: 0.46, w: 64, color: 0x7fae6b, emoji: '🪴', shape: 'box' },
  ],
  party: [
    { id: 'stage', kind: '무대', x: 0.5, y: 0.16, w: 300, color: 0xe0a85f, emoji: '🎉', shape: 'box' },
    { id: 'balloon', kind: '풍선', x: 0.16, y: 0.2, w: 80, color: 0xe06a8a, emoji: '🎈', shape: 'round' },
    { id: 'garland', kind: '가랜드', x: 0.84, y: 0.18, w: 120, color: 0xf0c98a, emoji: '🎏', shape: 'box' },
  ],
  club: [
    { id: 'stage', kind: '무대', x: 0.5, y: 0.16, w: 300, color: 0x3a2f55, emoji: '🎛️', shape: 'box' },
    { id: 'disco', kind: '디스코볼', x: 0.5, y: 0.08, w: 72, color: 0xb9c2d6, emoji: '🪩', shape: 'round' },
    { id: 'light', kind: '조명', x: 0.18, y: 0.2, w: 80, color: 0x6a4fd0, emoji: '💡', shape: 'round' },
  ],
}

export const PLAZA_THEME_LABEL: Record<PlazaTheme, string> = { wedding: '결혼식', party: '파티', club: '클럽' }

// ─ 광장 군중 (모이) ─
export interface PlazaMoi {
  id: string
  /** ③ 오프라인 이음 = 실명 공개. */
  name: string
  /** 본인 밝힌 관계·소속(③ 공개). */
  role: string
  /** 광장 바닥 정규화 좌표 0~1. */
  x: number
  y: number
  /** placeholder 몸 색(pixi hex) — 손그림 모이 스프라이트로 교체. */
  color: number
  me?: boolean
}

const NAMES = ['서연', '준호', '민지', '태윤', '하은', '도현', '지우', '수아', '예진', '시우', '하준', '지호', '민서', '서윤', '지안', '하린', '은우', '유진', '다은', '준우']
const ROLES = ['신부측 친구', '신랑측 직장 동료', '신부 사촌', '신랑 대학 친구', '신부측 회사 선배', '신랑측 동네 선배', '신부 고향 친구', '신랑 동호회', '양가 친지', '신부측 동창']
const COLORS = [0xe6a3b6, 0x88b0d8, 0xf0c98a, 0x9ad0b0, 0xc8a6e0, 0xe0b48a, 0x9ec8e8, 0xd99bb0, 0x8fcdb6, 0xe8c07a]

// 결정적 생성기(시드 고정) — 재현 가능. 중앙 버진로드(0.42~0.58) 회피해 좌/우 군집.
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}
function genCrowd(n: number): PlazaMoi[] {
  const rng = makeRng(42)
  const out: PlazaMoi[] = [{ id: 'me', name: '나 (유상)', role: '나의 모이', x: 0.5, y: 0.88, color: 0x9ec8e8, me: true }]
  for (let i = 0; i < n; i++) {
    const left = rng() < 0.5
    const x = left ? 0.06 + rng() * 0.32 : 0.62 + rng() * 0.32
    const y = 0.28 + rng() * 0.54
    out.push({ id: `c${i}`, name: NAMES[i % NAMES.length], role: ROLES[i % ROLES.length], x, y, color: COLORS[i % COLORS.length] })
  }
  return out
}

/** 데모 군중 60(구조는 150~300 확장형 — genCrowd 인자만 변경). */
export const PLAZA_CROWD = genCrowd(60)
export const CROWD_BY_ID: Record<string, PlazaMoi> = Object.fromEntries(PLAZA_CROWD.map((m) => [m.id, m]))
