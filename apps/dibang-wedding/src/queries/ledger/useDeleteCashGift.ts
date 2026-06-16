import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteCashGiftMutation,
  listCashGiftsInfiniteQueryKey,
  getCashGiftsSummaryQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

export function useDeleteCashGift(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    ...deleteCashGiftMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listCashGiftsInfiniteQueryKey({ path: { weddingId: weddingId! } }),
      });
      queryClient.invalidateQueries({
        queryKey: getCashGiftsSummaryQueryKey({ path: { weddingId: weddingId! } }),
      });
    },
  });
}
