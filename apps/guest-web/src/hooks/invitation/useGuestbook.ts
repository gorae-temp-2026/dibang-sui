import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listGuestbookEntriesQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import { createGuestbookEntry, listGuestbookEntries } from '@gorae/contracts/sdk.gen';

/**
 * 라운지 방명록 무한 스크롤 + 작성 mutation.
 * (UI/데이터 분리 1-D: useInfiniteQuery로 재작성하여 select 안 setState 안티패턴 + 중복 상태 보관 제거)
 *
 * - 페이지네이션: useInfiniteQuery + getNextPageParam (next_cursor)
 * - 누적 entries: React Query 캐시에 일임 (pages.flatMap)
 * - 작성 후 캐시 무효화로 첫 페이지부터 재조회 → 새 글이 자연스럽게 맨 위에
 */
export function useGuestbook(loungeId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: loungeId
      ? listGuestbookEntriesQueryKey({ path: { loungeId }, query: { limit: 10 } })
      : ['guestbook', 'disabled'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await listGuestbookEntries({
        path: { loungeId: loungeId! },
        query: { limit: 10, cursor: pageParam as string | undefined },
      });
      if (error || !data) throw new Error('failed to load guestbook entries');
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor ?? undefined : undefined),
    enabled: !!loungeId,
  });

  const entries = query.data?.pages.flatMap((p) => p.data) ?? [];

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: async ({ name, message }: { name: string; message: string }) => {
      const { data } = await createGuestbookEntry({
        path: { loungeId: loungeId! },
        body: { guest_name: name, message, recipient_slot: 'groom', relation_category: '친구/지인' },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: () => {
      if (!loungeId) return;
      queryClient.invalidateQueries({
        queryKey: listGuestbookEntriesQueryKey({ path: { loungeId } }),
      });
    },
  });

  return {
    entries,
    hasMore: !!query.hasNextPage,
    isLoading: query.isLoading,
    isSubmitting,
    loadMore: () => {
      void query.fetchNextPage();
    },
    submit: (name: string, message: string) => submit({ name, message }),
  };
}
