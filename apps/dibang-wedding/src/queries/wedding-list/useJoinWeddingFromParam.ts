import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyParticipatedWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import { getWedding, createLoungeCheckIn, claimGuestbookEntry } from '@gorae/contracts/sdk.gen';
import { useOnchainCheckIn } from '../../hooks/useOnchainCheckIn';

interface JoinWeddingFromParamVars {
  weddingId: string;
  entryId?: string | null;
}

/**
 * URL param (weddingId, entryId)로 진입 시:
 *   1) wedding 조회
 *   2) wedding.lounge.id 가 있으면 createLoungeCheckIn (+ 온체인 participate best-effort)
 *   3) entryId 있으면 claimGuestbookEntry
 * 후속 호출(2,3)은 실패해도 무시 — 원본 패턴 유지.
 * 성공 시 getMyParticipatedWeddings 쿼리 무효화.
 *
 * ⚠️ TRANSITIONAL — 링크 입장도 "참석"이므로 DB 체크인과 함께 온체인 event::participate를 best-effort
 *   발행한다(useOnchainCheckIn 내부 멱등 — 기존 참가 있으면 무동작).
 */
export function useJoinWeddingFromParam() {
  const queryClient = useQueryClient();
  const participateOnchain = useOnchainCheckIn();

  return useMutation({
    mutationFn: async ({ weddingId, entryId }: JoinWeddingFromParamVars) => {
      const { data: wedding } = await getWedding({
        path: { weddingId },
        throwOnError: true,
      });
      if (wedding.lounge?.id) {
        await createLoungeCheckIn({ path: { loungeId: wedding.lounge.id } }).catch(() => {});
        // 온체인 참석 기록(participate) — 비차단 best-effort.
        void participateOnchain(wedding.lounge.id);
      }
      // GuestbookEntry를 현재 유저에 연결
      if (entryId) {
        await claimGuestbookEntry({ path: { entryId } }).catch(() => {});
      }
      return wedding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyParticipatedWeddingsQueryKey() });
    },
  });
}
