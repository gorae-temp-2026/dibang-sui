// ★ DEV 전용 — 철수 1인칭 데모 fixture(데모_시나리오_260620.md). 프로덕션 미사용(dev 시더만 참조).
// prod 쓰기 0 · 철수·영희·예정결혼식·참여결혼식 = fixture. 날짜 기준 = 2026-06-20.
import type { User, WeddingSummary, ParticipatedWedding, Wedding, Lounge, FeedItem, Announcement } from '@gorae/contracts'

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

// 참여한 이벤트 = 철수의 사회적 이력(과거 다수 + 다가오는 일부). 모두 fixture.
// 이벤트 일반화: type('wedding'|'party'). 웨딩=신랑♥신부 / 파티=title 표시.
export type EventItem = ParticipatedWedding & { type: 'wedding' | 'party'; title?: string }

const part = (id: string, g: string, b: string, date: string, venue: string, hall: string, loungeId: string, time = '12:00'): EventItem => ({
  id,
  groom_name: g,
  bride_name: b,
  date,
  time,
  venue_name: venue,
  venue_hall: hall,
  lounge_id: loungeId,
  type: 'wedding',
})

// 파티 이벤트 — 커플명 대신 title 표시.
const party = (id: string, title: string, date: string, venue: string, hall: string, loungeId: string, time: string): EventItem => ({
  id,
  groom_name: '',
  bride_name: '',
  date,
  time,
  venue_name: venue,
  venue_hall: hall,
  lounge_id: loungeId,
  type: 'party',
  title,
})

export const PARTICIPATED: EventItem[] = [
  // 다가오는(미래)
  party('pw-up-party', '정해린의 생일파티', '2026-07-04', '피플더 테라스 라운지', '청담동', 'lng-up-party', '19:00'),
  part('pw-up1', '박준영', '한소희', '2026-07-11', '아펠가모 선릉', '루나홀', 'lng-up1', '11:00'),
  part('pw-up2', '정우성', '김지원', '2026-08-23', '라움 아트센터', '그랜드볼룸', 'lng-up2', '14:00'),
  // 지난(과거)
  part('pw-1', '강병주', '송민정', '2026-05-16', '소노펠리체 라비에벨', '채플', 'lng-1', '13:30'),
  party('pw-past-party', '북한산 등산 동호회 파티', '2026-05-02', '북한산 백운대 입구', '', 'lng-past-party', '10:00'),
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

// ─ 철수♥영희 라운지(LoungeV2 피드 시드) — 'Failed to fetch' 제거 + 살아있는 피드 ─
export const CHULSOO_LOUNGE = {
  id: CHULSOO_LOUNGE_ID,
  wedding_id: CHULSOO_WEDDING_ID,
  name: '김철수 · 이영희의 라운지',
  gather_place: { id: 'gp-chulsoo', name: '모이가 모인곳' },
} as unknown as Lounge

export const CHULSOO_WEDDING_FULL = {
  id: CHULSOO_WEDDING_ID,
  status: 'active',
  info: { groom_name: '김철수', bride_name: '이영희', groom_father_name: '김영호', groom_mother_name: '박순자', bride_father_name: '이상철', bride_mother_name: '최미경', date: '2026-09-19', time: '13:00', venue_name: '더채플 청담', venue_hall: '그랜드홀' },
  hosts: { host_groom_id: CHULSOO_ME.id, host_bride_id: 'younghee-dev' },
  lounge: { id: CHULSOO_LOUNGE_ID, name: '김철수 · 이영희의 라운지' },
  invitations: [],
  created_at: '2026-06-01T00:00:00Z',
} as unknown as Wedding

const fi = (type: string, id: string, created_at: string, data: Record<string, unknown>, heart?: number): FeedItem =>
  ({ type, id, created_at, data, ...(heart != null ? { heart_count: heart, comment_count: 0, my_heart: false } : {}) } as unknown as FeedItem)

export const CHULSOO_FEED: FeedItem[] = [
  // 라운지 이벤트 알림(들러리 선정) — v2.0 feed 탭 형태. 축가 자리(GiftSheet)와 연결.
  fi('lounge_event', 'ev1', '2026-06-19T11:00:00Z', { event_text: '축가 들러리(Bestman)로 선정되었어요 🎤', guest_name: '하린', recipient_slot: 'groom', relation_category: '친구/지인' }),
  fi('memory', 'm1', '2026-06-18T10:00:00Z', { text: '영희랑 첫 데이트 장소 다시 와봤어 🥰', photo_url: '/assets/inyeon-photos/a2.jpg', author_name: '김철수' }),
  fi('guestbook_message', 'gm1', '2026-06-17T21:00:00Z', { message: '철수야 영희야 결혼 진심으로 축하해!! 🎉', guest_name: '박준영', recipient_slot: 'groom', relation_category: '친구/지인', relation_detail: '대학 동기', view_count: 42 }),
  fi('guestbook_message', 'gm2', '2026-06-17T20:10:00Z', { message: '두 사람 너무 잘 어울려요 행복하세요 💕', guest_name: '한소희', recipient_slot: 'bride', relation_category: '직장동료', view_count: 31 }),
  fi('guestbook_entry', 'ge1', '2026-06-16T18:00:00Z', { guest_name: '정우성', recipient_slot: 'groom', relation_category: '친구/지인', relation_detail: '고향 친구' }, 12),
  fi('memory', 'm2', '2026-06-15T12:00:00Z', { text: '상견례 무사히 마쳤습니다 🙏', photo_url: '/assets/inyeon-photos/b1.jpg', author_name: '이영희' }),
  fi('guestbook_message', 'gm3', '2026-06-14T09:30:00Z', { message: '청첩장 너무 예뻐요! 그날 봬요 😊', guest_name: '김지원', recipient_slot: 'bride', relation_category: '동문/동창', view_count: 18 }),
  // 라운지 이벤트 알림(디방화환 선물) — v2.0 feed 탭 형태.
  fi('lounge_event', 'ev2', '2026-06-13T15:00:00Z', { event_text: '100인치 디방화환을 선물했어요 📺', guest_name: '문재호', recipient_slot: 'groom', relation_category: '친구/지인', relation_detail: '깐부' }),
]

export const CHULSOO_ANNOUNCEMENTS = [
  { id: 'an1', lounge_id: CHULSOO_LOUNGE_ID, host_id: CHULSOO_ME.id, message: '와주시는 모든 분들께 미리 감사드려요 🙏 주차는 건물 지하 1~3층 가능합니다.', is_pinned: true, created_at: '2026-06-18T08:00:00Z' },
] as unknown as Announcement[]

// ─ 지난 이벤트 '강병주 & 송민정' 라운지(lng-1) — 보조 동선 콘텐츠 시드(CHULSOO 패턴) ─
// 철수는 하객(host 아님). 기본 피드만 시드. 나머지 지난 이벤트 라운지는 비활성(시드 없음).
export const BYEONGJU_LOUNGE_ID = 'lng-1'
export const BYEONGJU_WEDDING_ID = 'pw-1'

export const BYEONGJU_LOUNGE = {
  id: BYEONGJU_LOUNGE_ID,
  wedding_id: BYEONGJU_WEDDING_ID,
  name: '강병주 · 송민정의 라운지',
  gather_place: { id: 'gp-byeongju', name: '모이가 모인곳' },
} as unknown as Lounge

export const BYEONGJU_WEDDING_FULL = {
  id: BYEONGJU_WEDDING_ID,
  status: 'completed',
  info: { groom_name: '강병주', bride_name: '송민정', date: '2026-05-16', time: '13:30', venue_name: '소노펠리체 라비에벨', venue_hall: '채플' },
  hosts: { host_groom_id: 'byeongju-host', host_bride_id: 'minjeong-host' },
  lounge: { id: BYEONGJU_LOUNGE_ID, name: '강병주 · 송민정의 라운지' },
  invitations: [],
  created_at: '2026-04-20T00:00:00Z',
} as unknown as Wedding

export const BYEONGJU_FEED: FeedItem[] = [
  fi('guestbook_message', 'bj-gm1', '2026-05-16T15:00:00Z', { message: '병주야 민정아 결혼 축하해!! 평생 행복하자 🎉', guest_name: '김철수', recipient_slot: 'groom', relation_category: '친구/지인', relation_detail: '대학 동기', view_count: 28 }),
  fi('memory', 'bj-m1', '2026-05-16T14:20:00Z', { text: '라비에벨 채플 너무 예뻤다 🌿', photo_url: '/assets/inyeon-photos/c2.jpg', author_name: '송민정' }),
  fi('guestbook_message', 'bj-gm2', '2026-05-16T13:50:00Z', { message: '두 사람 너무 잘 어울려요 💕', guest_name: '문가영', recipient_slot: 'bride', relation_category: '직장동료', view_count: 19 }),
  fi('guestbook_entry', 'bj-ge1', '2026-05-16T13:10:00Z', { guest_name: '이도현', recipient_slot: 'groom', relation_category: '친구/지인', relation_detail: '고향 친구' }, 9),
]

export const BYEONGJU_ANNOUNCEMENTS = [
  { id: 'bj-an1', lounge_id: BYEONGJU_LOUNGE_ID, host_id: 'byeongju-host', message: '함께해 주신 모든 분들께 감사드립니다 🙏', is_pinned: true, created_at: '2026-05-16T12:00:00Z' },
] as unknown as Announcement[]

