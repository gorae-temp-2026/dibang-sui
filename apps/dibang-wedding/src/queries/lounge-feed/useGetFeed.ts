import { useInfiniteQuery } from '@tanstack/react-query';
import { listFeed } from '@gorae/contracts/sdk.gen';
import { listFeedInfiniteQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetFeed(loungeId: string) {
  return useInfiniteQuery({
    queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }),
    queryFn: async ({ pageParam }) => {
      const { data } = await listFeed({
        path: { loungeId },
        query: { limit: 20, cursor: pageParam },
        throwOnError: true,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    refetchInterval: 5000,
    staleTime: 3000,
    enabled: !!loungeId,
  });
}
