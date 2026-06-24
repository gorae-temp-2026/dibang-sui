import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAnnouncementMutation,
  listAnnouncementsQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';
import { useOnchainAnnouncement } from '../../hooks/useOnchainAnnouncement';

// ⚠️ 전환기 dual-write: DB(표시 캐시) 저장 후 공지 본문을 Walrus+온체인 announcement(SSOT)에도 best-effort 기록.
export function useCreateAnnouncement(loungeId: string) {
  const queryClient = useQueryClient();
  const recordOnchainAnnouncement = useOnchainAnnouncement(loungeId);

  return useMutation({
    ...createAnnouncementMutation(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: listAnnouncementsQueryKey({ path: { loungeId } }) });
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }) });
      // 온체인 SSOT 기록(best-effort) — 공지 본문을 Walrus blobId로 announcement에 남긴다. 실패해도 DB 공지는 유지.
      const body = variables.body;
      if (body?.message) {
        void recordOnchainAnnouncement({ message: body.message, isPinned: body.is_pinned });
      }
    },
  });
}
