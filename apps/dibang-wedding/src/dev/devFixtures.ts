// ★ DEV 전용 — 철수 1인칭 데모 fixture(데모_시나리오_260620.md). 프로덕션 미사용(dev 시더만 참조).
// prod 쓰기 0 · 철수·영희·예정결혼식·참여결혼식 = fixture. 날짜 기준 = 2026-06-20.
import type { User, WeddingSummary, ParticipatedWedding } from '@gorae/contracts'

// 로그인 사용자 = 철수.
export const CHULSOO_ME: User = {
  id: 'chulsoo-dev',
  name: '김철수',
  email: 'chulsoo@dibang.dev',
  profile_image_url: '/assets/inyeon-photos/my-profile.jpg',
  created_at: '2024-01-01T00:00:00Z',
  consents_required: [],
  marketing_agreed: true,
}

// My event = 철수♥영희 '예정 결혼식'(아직 미발생). status=active + 미래 날짜.
export const CHULSOO_WEDDING_ID = 'w-chulsoo-younghee'
export const CHULSOO_LOUNGE_ID = 'lounge-chulsoo-younghee'
export const MY_WEDDINGS: WeddingSummary[] = [
  {
    id: CHULSOO_WEDDING_ID,
    status: 'active',
    groom_name: '김철수',
    bride_name: '이영희',
    groom_father_name: '김영호',
    groom_mother_name: '박순자',
    bride_father_name: '이상철',
    bride_mother_name: '최미경',
    date: '2026-09-19',
    time: '13:00',
    venue_name: '더채플 청담',
    venue_hall: '그랜드홀',
    invitations: [{ id: 'inv-chulsoo', slug: 'chulsoo-younghee' }],
    lounge_id: CHULSOO_LOUNGE_ID,
  },
]

// 참여한 결혼식 = 철수의 사회적 이력(과거 다수 + 다가오는 일부). 모두 fixture.
const part = (id: string, g: string, b: string, date: string, venue: string, hall: string, loungeId: string, time = '12:00'): ParticipatedWedding => ({
  id,
  groom_name: g,
  bride_name: b,
  date,
  time,
  venue_name: venue,
  venue_hall: hall,
  lounge_id: loungeId,
})

export const PARTICIPATED: ParticipatedWedding[] = [
  // 다가오는(미래)
  part('pw-up1', '박준영', '한소희', '2026-07-11', '아펠가모 선릉', '루나홀', 'lng-up1', '11:00'),
  part('pw-up2', '정우성', '김지원', '2026-08-23', '라움 아트센터', '그랜드볼룸', 'lng-up2', '14:00'),
  // 지난(과거)
  part('pw-1', '강병주', '송민정', '2026-05-16', '소노펠리체 라비에벨', '채플', 'lng-1', '13:30'),
  part('pw-2', '이도현', '문가영', '2026-04-12', '그랜드 하얏트 서울', '그랜드볼룸', 'lng-2', '12:00'),
  part('pw-3', '최우식', '전소민', '2025-11-09', '더라움', '컨벤션홀', 'lng-3', '15:00'),
  part('pw-4', '남주혁', '배수지', '2025-10-18', '워커힐 르뱅', '애스톤하우스', 'lng-4', '11:30'),
  part('pw-5', '박서준', '김다미', '2025-06-21', '반포 JW메리어트', '그랜드볼룸', 'lng-5', '13:00'),
  part('pw-6', '류준열', '혜리', '2025-05-24', '63 컨벤션', '그레이스홀', 'lng-6', '12:30'),
  part('pw-7', '공유', '윤은혜', '2024-12-14', '시그니엘 서울', '그랜드볼룸', 'lng-7', '14:30'),
  part('pw-8', '조정석', '거미', '2024-10-05', '더플라자 호텔', '그랜드볼룸', 'lng-8', '11:00'),
  part('pw-9', '윤계상', '한지민', '2024-09-21', '비채나', '메인홀', 'lng-9', '13:00'),
  part('pw-10', '이제훈', '이엘', '2024-05-18', '신라호텔', '다이너스티홀', 'lng-10', '12:00'),
]

// ─ DeFi 티저용 철수 결혼식 하객 예측 (Moi Credit·신뢰망 기반, 데모 수치) ─
export const WEDDING_FORECAST = {
  moiCredit: 834,
  tier: 'AAA',
  /** 예상 하객 수(호혜 관계·이음 강도 기반). */
  expectedGuests: 142,
  /** 예상 축의금(예측 가능한 미래 현금 유입, 원). */
  expectedGift: 18_400_000,
  /** 무담보 웨딩 대출 한도(데모 — Moi Credit·예상 부조 근거). */
  loanLimit: 12_000_000,
}
