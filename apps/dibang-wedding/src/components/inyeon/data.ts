// 디방인연 데모 데이터 + 요네 상수 — 목업 SSOT(`디방인연_틴더식_목업_260617.html`) 기준.
// ⚠️ 사진 무료 장수: 목업 코드 `FREE_PHOTOS=2`(대표 포함 2장 무료, 3장째 요네) + 킥오프 프롬프트 일치.
//    (기능정의 산문은 3장이라 적었으나 코드/프롬프트=2가 SSOT. 합동 확정 시 1줄 변경.)
import type { Moi, Tier } from './types'

export const PHOTO_COST = 20 // 추가 사진 열람(=관심 신호) 요네
export const FREE_PHOTOS = 2 // 대표 포함 무료 노출 장수 — 3장째부터 요네
export const START_YONE = 1250

/** 대화 열기 요네 — 관계 거리(티어)별. 같은 이벤트 0 / 2~3다리 50 / 낯선 200 (데모값). 먼저 다가간 쪽 부담. */
export const DM_COST: Record<Tier, number> = { 0: 0, 1: 50, 2: 200 }

export const TIER_META: Record<Tier, { key: 'free' | 'low' | 'high'; label: string }> = {
  0: { key: 'free', label: '함께 참여한 결혼식' },
  1: { key: 'low', label: '두 다리 건너' },
  2: { key: 'high', label: '새 인연' },
}

/** 이음 전 generic 헤드라인 (구체 식장·하객은 이음 후 대화에서 — 기능정의 §5). */
export const TIER_HOOK: Record<Tier, string> = {
  0: '함께 참여한 결혼식이 있어요',
  1: '두 다리 건너 아는 사이예요',
  2: '아직 마주친 적 없는 새 인연이에요',
}

const photos = (...hues: number[]) => hues.map((hue) => ({ hue }))

export const POOL: Moi[] = [
  {
    id: 201, name: '서아', photos: photos(212, 18, 280, 150), online: true, tier: 0, deg: 1,
    hook: TIER_HOOK[0], mutualCount: 3, balLabel: '매우 높음', barsF: 5, net: 41,
    prov: [{ emoji: '💍', text: '같은 결혼식 참석', sub: '하객으로 함께', tier: 0 }],
  },
  {
    id: 202, name: '지후', photos: photos(150, 95, 40), online: false, tier: 1, deg: 2,
    hook: TIER_HOOK[1], mutualCount: 2, balLabel: '높음', barsF: 4, net: 28,
    prov: [{ emoji: '🤝', text: '공통 이음 2명', sub: '수아·지현을 통해 연결', tier: 1 }],
  },
  {
    id: 203, name: '하늘', photos: photos(330, 200), online: true, tier: 0, deg: 1,
    hook: TIER_HOOK[0], mutualCount: 5, balLabel: '매우 높음', barsF: 5, net: 53,
    prov: [{ emoji: '💍', text: '같은 결혼식 참석', sub: '신부측 하객', tier: 0 }],
  },
  {
    id: 204, name: '도윤', photos: photos(20, 250, 110, 60), online: false, tier: 2, deg: 4,
    hook: TIER_HOOK[2], mutualCount: 0, balLabel: '보통', barsF: 3, net: 17,
    prov: [{ emoji: '✨', text: '새로운 인연', sub: '아직 접점 없음', tier: 2 }],
  },
  {
    id: 205, name: '수아', photos: photos(190, 300, 35), online: true, tier: 1, deg: 3,
    hook: TIER_HOOK[1], mutualCount: 1, balLabel: '높음', barsF: 4, net: 33,
    prov: [{ emoji: '🤝', text: '공통 이음 1명', sub: '지현을 통해 연결', tier: 1 }],
  },
  {
    id: 206, name: '예준', photos: photos(265, 130), online: false, tier: 2, deg: 5,
    hook: TIER_HOOK[2], mutualCount: 0, balLabel: '상위 추정', barsF: 4, net: 22,
    prov: [{ emoji: '✨', text: '새로운 인연', sub: '먼 관계 거리', tier: 2 }],
  },
  {
    id: 207, name: '민서', photos: photos(160, 25, 290, 80), online: true, tier: 0, deg: 1,
    hook: TIER_HOOK[0], mutualCount: 4, balLabel: '매우 높음', barsF: 5, net: 47,
    prov: [{ emoji: '💍', text: '같은 결혼식 참석', sub: '신랑측 하객', tier: 0 }],
  },
]
