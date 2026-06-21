// 들러리 · 선물 · 참여(MAKERS) — 라운지 GiftSheet 데이터.
// SSOT: 해커톤/수이해커톤/모이가모인곳_v2.0.html gift 탭(들러리 자리 · 43/100인치 디방화환 · MAKERS).
// 들러리 일부 담당 = 라운지 tier0 인연 페르소나(서아·하늘·하린, inyeon/data POOL)와 매칭 → 라운지=인연 동일 인물(실명·실사진).
// 나머지는 오프라인 마스킹 이름. prod 연결 0(데모 목업).

const PHOTO = '/assets/inyeon-photos'
/** 손그림 모이 head 에셋 경로 — 실사진 없는(또는 깨진) 들러리·후보 얼굴 fallback. */
export const MOI_HEAD_BASE = '/assets/moi/heads'

export type Team = 'groomsman' | 'bridesmaid'
export type Medal = 'bestman' | 'maid'

export interface RoleSlot {
  id: string
  /** 자리명(축가·사회·부케순이·축무·축의대…). */
  label: string
  status: 'done' | 'pending'
  /** 특별 직함 메달(있을 때만). */
  medal?: Medal
  // ── 마감(done) ──
  name?: string
  team?: Team
  hearts?: number
  /** 인연 페르소나 실사진(persona-{id}.png 규칙·매칭된 자리만). 없거나 깨지면 손그림 head fallback. */
  photoUrl?: string
  /** 손그림 모이 얼굴(head 에셋 id) — 실사진 미매칭/깨짐 시 표시. */
  head?: string
  /** 인연 페르소나 연결(POOL id) — 라운지=인연 동일 인물. */
  personaId?: number
  // ── 진행중(pending) ──
  candidates?: number
  /** 지원 마감 ISO(카운트다운). */
  deadline?: string
}

// 마감된 자리 — 축가(Bestman)·사회·부케순이(Maid)·축무×3·축의대(신랑×2·신부).
// 하린=축가(Bestman) · 서아=부케순이(Maid) · 하늘=축무 → tier0 페르소나 매칭(실명·실사진).
// 실사진 = 이 결혼식 참석 페르소나 몇 명(하린·서아·하늘)만. 나머지는 손그림 모이 얼굴(head).
export const ROLE_SLOTS_DONE: RoleSlot[] = [
  { id: 'song', label: '축가', status: 'done', medal: 'bestman', name: '하린', team: 'groomsman', hearts: 47, photoUrl: `${PHOTO}/g1.jpg`, head: 'chu_default', personaId: 207 },
  { id: 'mc', label: '사회', status: 'done', name: '이○근', team: 'groomsman', hearts: 28, head: 'chu_sport' },
  { id: 'bouquet', label: '부케순이', status: 'done', medal: 'maid', name: '서아', team: 'bridesmaid', hearts: 63, photoUrl: `${PHOTO}/a1.jpg`, head: 'yh_pigtail', personaId: 201 },
  { id: 'dance1', label: '축무', status: 'done', name: '하늘', team: 'bridesmaid', hearts: 38, photoUrl: `${PHOTO}/c1.jpg`, head: 'yh_bob', personaId: 203 },
  { id: 'dance2', label: '축무', status: 'done', name: '박○지', team: 'bridesmaid', hearts: 31, head: 'yh_bob' },
  { id: 'dance3', label: '축무', status: 'done', name: '정○서', team: 'bridesmaid', hearts: 23, head: 'yh_pigtail' },
  { id: 'cash-g1', label: '축의대(신랑측)', status: 'done', name: '조○세', team: 'groomsman', hearts: 19, head: 'chu_buzz' },
  { id: 'cash-g2', label: '축의대(신랑측)', status: 'done', name: '조○민', team: 'groomsman', hearts: 16, head: 'chu_shaggy' },
  { id: 'cash-b1', label: '축의대(신부측)', status: 'done', name: '송○진', team: 'bridesmaid', hearts: 24, head: 'yh_bob' },
]

// 진행중 자리 — 후보자 모집 + 지원 마감 카운트다운.
export const ROLE_SLOTS_PENDING: RoleSlot[] = [
  { id: 'bag', label: '가방순이', status: 'pending', candidates: 3, deadline: '2026-08-22T22:00:00+09:00', head: 'yh_pigtail' },
  { id: 'flower', label: '화동', status: 'pending', candidates: 1, deadline: '2026-08-22T22:00:00+09:00', head: 'chu_default' },
  { id: 'after', label: '뒷풀이 리더', status: 'pending', candidates: 2, deadline: '2026-08-29T22:00:00+09:00', head: 'chu_sport' },
  { id: 'cash-b2', label: '축의대(신부측)', status: 'pending', candidates: 1, deadline: '2026-08-22T22:00:00+09:00', head: 'yh_bob' },
]

export const TEAM_LABEL: Record<Team, string> = { groomsman: 'Groomsman', bridesmaid: 'Bridesmaid' }
export const MEDAL_LABEL: Record<Medal, string> = { bestman: 'Bestman', maid: 'Maid of Honor' }

// ── 선물 — 디방화환(43/100인치) ──
export interface GiftProduct {
  id: string
  name: string
  desc: string
  yone: number
  /** 카드 환산(약). */
  krw: string
  premium?: boolean
}

export const GIFT_PRODUCTS: GiftProduct[] = [
  { id: '43inch', name: '43인치 디방화환', desc: '결혼식장 입구에 비치되는 43인치 디지털 디스플레이. 모이가 모인곳에 사진·메시지가 누적돼요.', yone: 300, krw: '약 43만원' },
  { id: '100inch', name: '100인치 디방화환', desc: '결혼식장 메인홀 100인치 대형 디스플레이. 식 전후로 사진·메시지·이벤트가 모이가 모인곳과 동기화돼요.', yone: 1200, krw: '약 171만원', premium: true },
]

/** 디방화환 결제 마감 = 식(2026-09-19) 2주 전. 식 전까지 확정돼야 웨딩홀 셋팅 진행. */
export const GIFT_DEADLINE = '2026-09-05T23:59:00+09:00'

/** 마감까지 남은 시간 — 데모 표시용(mount 시 1회 계산). 만료 시 expired. */
export function timeUntil(deadlineIso: string): { days: number; hours: number; expired: boolean; label: string } {
  const target = new Date(deadlineIso).getTime()
  const diff = target - Date.now()
  if (Number.isNaN(target) || diff <= 0) return { days: 0, hours: 0, expired: true, label: '마감' }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return { days, hours, expired: false, label: days > 0 ? `D-${days}` : `${hours}시간` }
}

// ── 참여(MAKERS) — 이 결혼식에 기여한 업체(목업). Host·Guest와 다른 자리. ──
// v2.0의 'iPhone' 타일은 의미 카테고리 'Snap'(아이폰 스냅)으로 정리.
export interface VendorSlot {
  id: string
  icon: string
  category: string
  vendor: string
}

export const VENDORS: VendorSlot[] = [
  { id: 'venue', icon: '🏛️', category: 'Venue', vendor: '더채플 청담' },
  { id: 'directing', icon: '🎬', category: 'Directing', vendor: '세컨드플로우' },
  { id: 'catering', icon: '🍽️', category: 'Catering', vendor: '테이블오브제' },
  { id: 'sound', icon: '🎵', category: 'Sound & Performance', vendor: '라이브웨이브' },
  { id: 'video', icon: '🎥', category: 'Video', vendor: '필름드구' },
  { id: 'photo', icon: '📸', category: 'Photo', vendor: '그라피 스튜디오' },
  { id: 'snap', icon: '📱', category: 'Snap', vendor: '데이라잇 스냅' },
  { id: 'dress', icon: '👰', category: 'Dress', vendor: '아틀리에 케이' },
  { id: 'makeup', icon: '💄', category: 'Make-up', vendor: '정샵 청담' },
]
