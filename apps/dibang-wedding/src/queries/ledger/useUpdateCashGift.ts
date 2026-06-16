import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateCashGiftMutation,
  listCashGiftsInfiniteQueryKey,
  getCashGiftsSummaryQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

export function useUpdateCashGift(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    ...updateCashGiftMutation(),
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
