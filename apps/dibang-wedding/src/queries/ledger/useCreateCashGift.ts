import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hostCreateCashGiftMutation,
  listCashGiftsInfiniteQueryKey,
  getCashGiftsSummaryQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

/**
 * 축의 기록(host create) mutation 훅.
 * (UI/데이터 분리 3-I: page가 useMutation + queryKey spread 조립하던 패턴을 데이터 훅으로 캡슐화)
 *
 * 성공 시 장부 무한 query + 요약 query 자동 무효화.
 * page는 onSuccess에서 폼 닫기 등 UI 처리만.
 */
export function useCreateCashGift(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    ...hostCreateCashGiftMutation(),
    onSuccess: () => {
      if (!weddingId) return;
      queryClient.invalidateQueries({
        queryKey: listCashGiftsInfiniteQueryKey({ path: { weddingId } }),
      });
      queryClient.invalidateQueries({
        queryKey: getCashGiftsSummaryQueryKey({ path: { weddingId } }),
      });
    },
  });
}
