// mecdisplay 워크스트림(SCENARIOS §3 S-01·S-02).
//
// v3 API 두 단계 chain:
//   (1) GET /weddings/{weddingId} → Wedding(info, lounge, invitations[])
//   (2) Wedding.invitations[0].slug → GET /invitations/{slug} → gallery_photos
//
// 결과를 mecdisplay 컴포넌트가 기대하는 DisplayWedding 형태(레거시 camelCase)와
// loungeId · photoUrls 평탄화 형태로 반환.

import { useQuery } from '@tanstack/react-query'
import {
  getWeddingOptions,
  getInvitationOptions,
} from '@gorae/contracts/@tanstack/react-query.gen'
import type { DisplayWedding } from '../components/display/types'

export interface UseDisplayWeddingResult {
  wedding: DisplayWedding | null
  loungeId: string | null
  photoUrls: string[]
  isLoading: boolean
  notFound: boolean
}

export function useDisplayWedding(weddingId: string | null): UseDisplayWeddingResult {
  const weddingQuery = useQuery({
    ...getWeddingOptions({ path: { weddingId: weddingId ?? '' } }),
    enabled: !!weddingId,
    retry: 0,
  })

  const firstSlug = weddingQuery.data?.invitations[0]?.slug ?? null
  const invitationQuery = useQuery({
    ...getInvitationOptions({ path: { slug: firstSlug ?? '' } }),
    enabled: !!firstSlug,
    retry: 0,
  })

  const wedding = weddingQuery.data ?? null
  // 고인(故人) 여부와 무관하게 혼주 이름은 항상 그대로 표시한다 (故 표기도 하지 않음).
  // (이전: deceased면 undefined로 치환해 미표시 → 2026-06-12 "무조건 표시, 故 표기 제외" 지시로 변경)
  const display: DisplayWedding | null = wedding
    ? {
        id: wedding.id,
        groomName: wedding.info.groom_name,
        brideName: wedding.info.bride_name,
        date: wedding.info.date,
        time: wedding.info.time,
        venue: wedding.info.venue.venue_name,
        venueAddress: wedding.info.venue.venue_address,
        photoUrl: invitationQuery.data?.cover_image,
        groomFatherName: wedding.info.groom_father_name,
        groomMotherName: wedding.info.groom_mother_name,
        brideFatherName: wedding.info.bride_father_name,
        brideMotherName: wedding.info.bride_mother_name,
      }
    : null

  return {
    wedding: display,
    loungeId: wedding?.lounge.id ?? null,
    photoUrls: invitationQuery.data?.gallery_photos ?? [],
    isLoading: !!weddingId && (weddingQuery.isLoading || (!!firstSlug && invitationQuery.isLoading)),
    notFound: weddingQuery.isError,
  }
}
