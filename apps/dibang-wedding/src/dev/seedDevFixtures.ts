// ★ DEV 전용 — 철수 1인칭 fixture를 QueryClient 캐시에 시드(setQueryData). prod 미연결·쓰기 0.
// bootstrap에서 dev 우회일 때만 호출. user-scoped/백엔드 쿼리는 세션 없이 anon으로 못 읽으므로 fixture 대체.
import type { QueryClient } from '@tanstack/react-query'
import {
  getMeOptions,
  getMyWeddingsOptions,
  getMyParticipatedWeddingsOptions,
  getLoungeOptions,
  getWeddingOptions,
  listAnnouncementsOptions,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen'
import {
  CHULSOO_ME,
  MY_WEDDINGS,
  PARTICIPATED,
  CHULSOO_LOUNGE_ID,
  CHULSOO_WEDDING_ID,
  CHULSOO_LOUNGE,
  CHULSOO_WEDDING_FULL,
  CHULSOO_FEED,
  CHULSOO_ANNOUNCEMENTS,
} from './devFixtures'

export function seedDevFixtures(qc: QueryClient) {
  qc.setQueryData(getMeOptions().queryKey, CHULSOO_ME)
  qc.setQueryData(getMyWeddingsOptions().queryKey, MY_WEDDINGS)
  qc.setQueryData(getMyParticipatedWeddingsOptions().queryKey, PARTICIPATED)
  // 철수♥영희 라운지 — 히어로 + 살아있는 피드(메모리·축하메시지·공지)로 'Failed to fetch' 제거.
  qc.setQueryData(getLoungeOptions({ path: { loungeId: CHULSOO_LOUNGE_ID } }).queryKey, CHULSOO_LOUNGE)
  qc.setQueryData(getWeddingOptions({ path: { weddingId: CHULSOO_WEDDING_ID } }).queryKey, CHULSOO_WEDDING_FULL)
  qc.setQueryData(listAnnouncementsOptions({ path: { loungeId: CHULSOO_LOUNGE_ID } }).queryKey, { data: CHULSOO_ANNOUNCEMENTS, has_more: false } as never)
  qc.setQueryData(listFeedInfiniteQueryKey({ path: { loungeId: CHULSOO_LOUNGE_ID } }), { pages: [{ data: CHULSOO_FEED, has_more: false }], pageParams: [undefined] } as never)
}
