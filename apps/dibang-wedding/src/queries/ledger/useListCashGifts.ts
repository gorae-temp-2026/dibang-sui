import { useInfiniteQuery } from '@tanstack/react-query';
import { listCashGifts } from '@gorae/contracts/sdk.gen';
import { listCashGiftsInfiniteQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

export function useListCashGifts(weddingId: string | undefined) {
  return useInfiniteQuery({
    queryKey: listCashGiftsInfiniteQueryKey({ path: { weddingId: weddingId! } }),
    queryFn: async ({ pageParam }) => {
      const { data } = await listCashGifts({
        path: { weddingId: weddingId! },
        query: { limit: 20, cursor: pageParam },
        throwOnError: true,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!weddingId,
  });
}
