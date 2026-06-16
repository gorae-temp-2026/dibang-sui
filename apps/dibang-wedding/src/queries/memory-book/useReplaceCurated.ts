import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWeddingMemoryBookQueryKey,
  replaceWeddingMemoryBookPhotosMutation,
} from '@gorae/contracts/@tanstack/react-query.gen';

/**
 * 메모리북 큐레이션 저장 mutation 훅.
 * (UI/데이터 분리 3-I: page가 useMutation + invalidate를 직접 조립하던 패턴을 데이터 훅으로 캡슐화)
 *
 * 호출자는 mutateAsync({ photoIds }) 호출. 성공 시 메모리북 캐시 자동 무효화.
 * navigate / 토스트 등은 호출 page의 onSuccess 콜백에서 처리.
 */
export function useReplaceCurated(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    ...replaceWeddingMemoryBookPhotosMutation(),
    onSuccess: () => {
      if (!weddingId) return;
      queryClient.invalidateQueries({
        queryKey: getWeddingMemoryBookQueryKey({ path: { weddingId } }),
      });
    },
  });
}
