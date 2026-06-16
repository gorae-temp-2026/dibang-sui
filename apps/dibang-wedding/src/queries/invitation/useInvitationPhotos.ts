/**
 * 청첩장 사진 목록 query 훅 (UI/데이터 분리 P3-8).
 *
 * listMobileInvitationPhotos를 useQuery로 감싸서
 * { data, isLoading, error, refetch }를 컴포넌트에 노출.
 * weddingId/invitationId가 없으면 enabled=false로 게이트.
 */
import { useQuery } from '@tanstack/react-query';
import { listMobileInvitationPhotosOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useInvitationPhotos(
  weddingId: string | undefined,
  invitationId: string | undefined,
) {
  return useQuery({
    ...listMobileInvitationPhotosOptions({
      path: { weddingId: weddingId!, invitationId: invitationId! },
    }),
    enabled: !!weddingId && !!invitationId,
  });
}
