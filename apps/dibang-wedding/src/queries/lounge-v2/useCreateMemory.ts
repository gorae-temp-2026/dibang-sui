import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAnnouncement, createMemory } from '@gorae/contracts/sdk.gen';
import {
  listFeedInfiniteQueryKey,
  listAnnouncementsQueryKey,
  listMemoriesQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

// 라운지 V2 컴포즈 제출 — Memory 도메인 분리 후 흐름 단순화
// (_scenario/memory-domain-split/SCENARIOS.md S-01·S-02·S-03):
//   - asAnnounce: 공지 발행 (createAnnouncement, host)
//   - 일반 글  : Memory 생성 (createMemory) — GuestbookEntry 의존 제거,
//                user_id 식별이라 호스트도 entry 없이 게시 가능.
// 성공 시 피드·공지·메모리 캐시 무효화.

interface CreateMemoryVars {
  text: string;
  asAnnounce: boolean;
  /** 첨부 사진 1장(presigned 업로드 완료 URL). 없으면 미전송. */
  photoUrl?: string;
}

export function useCreateMemory(loungeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, asAnnounce, photoUrl }: CreateMemoryVars) => {
      if (asAnnounce) {
        await createAnnouncement({
          path: { loungeId },
          body: { message: text, is_pinned: false },
          throwOnError: true,
        });
        return;
      }
      await createMemory({
        body: { lounge_id: loungeId, text, photo_url: photoUrl },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listMemoriesQueryKey({ path: { loungeId } }),
      });
      queryClient.invalidateQueries({
        queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }),
      });
      queryClient.invalidateQueries({
        queryKey: listAnnouncementsQueryKey({ path: { loungeId } }),
      });
    },
  });
}
