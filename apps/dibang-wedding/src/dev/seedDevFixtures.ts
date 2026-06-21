// ★ DEV 전용 — 철수 1인칭 fixture를 QueryClient 캐시에 시드(setQueryData). prod 미연결·쓰기 0.
// bootstrap에서 dev 우회일 때만 호출. user-scoped 쿼리(getMe/getMyWeddings/participated)는
// 세션 없이 anon으로 못 읽으므로 fixture로 대체. 라운지/MEC 등 공개 데이터는 시드 안 함(실 anon 시도).
import type { QueryClient } from '@tanstack/react-query'
import { getMeOptions, getMyWeddingsOptions, getMyParticipatedWeddingsOptions } from '@gorae/contracts/@tanstack/react-query.gen'
import { CHULSOO_ME, MY_WEDDINGS, PARTICIPATED } from './devFixtures'

export function seedDevFixtures(qc: QueryClient) {
  qc.setQueryData(getMeOptions().queryKey, CHULSOO_ME)
  qc.setQueryData(getMyWeddingsOptions().queryKey, MY_WEDDINGS)
  qc.setQueryData(getMyParticipatedWeddingsOptions().queryKey, PARTICIPATED)
}
