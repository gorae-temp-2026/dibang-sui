import { useInfiniteQuery } from '@tanstack/react-query';
import { listFeed } from '@gorae/contracts/sdk.gen';
import { listFeedInfiniteQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

/**
 * Ledger 페이지의 축하 메시지 탭 전용 listFeed 훅.
 * lounge-feed/useGetFeed 와는 달리 polling(refetchInterval) 없이 enabled 게이트만 둔다.
 */
export function useListFeed(loungeId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: listFeedInfiniteQueryKey({ path: { loungeId: loungeId! } }),
    queryFn: async ({ pageParam }) => {
      const { data } = await listFeed({
        path: { loungeId: loungeId! },
        query: { limit: 20, cursor: pageParam },
        throwOnError: true,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!loungeId && enabled,
  });
}
