// 모이가모인곳(④) 미니룸 데모 데이터 — 샵 카탈로그 + 룸 모이 풀.
// 카탈로그 SSOT = `미니룸_에셋스펙_AI프롬프트_260620.md` §2 (가구5·옷4 = AI 생성 슬롯과 1:1 대응).
//   ⚠️ v2.0 목업 샵과 가격·아이템셋이 다름 — 에셋 슬롯 교체가 깔끔하려면 코드 슬롯=에셋스펙 기준.
// 가격은 데모용(에셋스펙 §2 "운영 시 조정"). 요네 차감 = 구매 1회 / 배치·장착 토글 무료.
// placeholder: 에셋(투명 PNG) 부재라 color/emoji로 렌더 → 에셋키(id)로 텍스처 슬롯 교체.

export type ShopCategory = 'interior' | 'outfit'
export type EquipSlot = 'head' | 'body'

export interface ShopItem {
  /** 에셋키 — placeholder→PNG 텍스처 슬롯 교체 키. 안정적으로 유지. */
  id: string
  name: string
  category: ShopCategory
  /** 구매 요네 (1회 차감). */
  yone: number
  desc: string
  emoji: string
  /** placeholder 색 (PNG 교체 전 도형 채움, pixi hex). */
  color: number
  /** 시그니처(대표) 아이템 강조. */
  signature?: boolean
  // ─ interior(가구·장식) 전용 ─
  size?: 'sm' | 'md' | 'lg'
  anchor?: 'floor-center' | 'floor' | 'wall'
  // ─ outfit(옷·액세서리) 전용 ─
  slot?: EquipSlot
}

// 에셋스펙 §2-1 가구·장식 + §2-2 모이 옷·액세서리.
export const SHOP: ShopItem[] = [
  // 가구·장식 (방에 배치)
  { id: 'fountain', name: '분수', category: 'interior', yone: 120, desc: '방 중앙 바닥 앵커 · 대표 시그니처', emoji: '⛲', color: 0x6fb7d6, size: 'lg', anchor: 'floor-center', signature: true },
  { id: 'bench', name: '나무 벤치', category: 'interior', yone: 40, desc: '벽면·바닥 · 중간 사이즈', emoji: '🪑', color: 0xb98a5e, size: 'md', anchor: 'floor' },
  { id: 'pot', name: '꽃 화분', category: 'interior', yone: 15, desc: '모서리·벽면 · 소형', emoji: '🪴', color: 0x7fae6b, size: 'sm', anchor: 'floor' },
  { id: 'wreath', name: '디지털 화환', category: 'interior', yone: 80, desc: '벽 걸이 또는 바닥 스탠드 · 디방화환 연계', emoji: '💐', color: 0xe39bb0, size: 'md', anchor: 'wall' },
  { id: 'giftbox', name: '선물 박스', category: 'interior', yone: 25, desc: '바닥 소형 · 들러리선물 연계', emoji: '🎁', color: 0xe0a85f, size: 'sm', anchor: 'floor' },
  // 모이 옷·액세서리 (캐릭터 장착)
  { id: 'ribbon', name: '리본 헤어밴드', category: 'outfit', yone: 12, desc: '머리 위 작은 포인트', emoji: '🎀', color: 0xe88aa6, slot: 'head' },
  { id: 'casual', name: '캐주얼', category: 'outfit', yone: 30, desc: '편한 후드·진 차림', emoji: '👕', color: 0x6f9bd0, slot: 'body' },
  { id: 'suit', name: '정장', category: 'outfit', yone: 50, desc: '단정한 정장 한 벌', emoji: '🤵', color: 0x3a4a66, slot: 'body' },
  { id: 'hanbok', name: '한복', category: 'outfit', yone: 90, desc: '고운 전통 한복 · 시그니처', emoji: '👘', color: 0xd96f86, slot: 'body', signature: true },
]

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP.map((it) => [it.id, it]))

/** 미니룸 시작 요네 (데모 — 시그니처 1점 + 소품 몇 개 살 정도). 목업 지갑값 기준. */
export const START_YONE_ROOM = 300
/** 충전 1회 단위(요네) — 실제 SUI/USDC 충전은 백엔드. 데모는 mock 적립. */
export const CHARGE_AMOUNT = 100

/** 룸에 모인 모이(하객 = 신뢰 네트워크 노드). 클릭 → 공유 ProfileSheet(③ 라운지 공개규칙).
 *  좌표 = 바닥 정규화(0~1) — 캔버스가 바닥 영역에 매핑. me=내 모이(샵 옷 장착 대상). */
export interface RoomMoi {
  id: string
  /** ③ 오프라인 이음 = 실명 공개. */
  name: string
  /** 본인 밝힌 관계·소속 (③ 공개). */
  role: string
  x: number
  y: number
  /** placeholder 몸 색(pixi hex) — 실제는 모이 대표 스프라이트. */
  color: number
  me?: boolean
}

export const MOI_POOL: RoomMoi[] = [
  { id: 'me', name: '나 (유상)', role: '나의 모이', x: 0.5, y: 0.66, color: 0x9ec8e8, me: true },
  { id: 'm1', name: '서연', role: '신부측 친구', x: 0.28, y: 0.54, color: 0xe6a3b6 },
  { id: 'm2', name: '준호', role: '신랑측 직장 동료', x: 0.72, y: 0.55, color: 0x88b0d8 },
  { id: 'm3', name: '민지', role: '신부 사촌', x: 0.18, y: 0.72, color: 0xf0c98a },
  { id: 'm4', name: '태윤', role: '신랑 대학 친구', x: 0.82, y: 0.71, color: 0x9ad0b0 },
  { id: 'm5', name: '하은', role: '신부측 회사 선배', x: 0.4, y: 0.8, color: 0xc8a6e0 },
  { id: 'm6', name: '도현', role: '신랑측 동네 선배', x: 0.62, y: 0.82, color: 0xe0b48a },
]

export const MOI_BY_ID: Record<string, RoomMoi> = Object.fromEntries(MOI_POOL.map((m) => [m.id, m]))
