import { useMutation } from '@tanstack/react-query';
import { getWedding } from '@gorae/contracts/sdk.gen';

/**
 * 사용자 액션(예: 라운지 버튼 클릭) 시점에 wedding을 1회성으로 조회하는 lazy 훅.
 * 캐싱이 필요한 경우 `useGetWedding`(useQuery 기반)을 사용한다.
 * 호출 측은 mutateAsync 반환값으로 wedding을 받아 후속 navigate 등을 수행한다.
 */
export function useGetWeddingLazy() {
  return useMutation({
    mutationFn: async ({ weddingId }: { weddingId: string }) => {
      const { data } = await getWedding({
        path: { weddingId },
        throwOnError: true,
      });
      return data;
    },
  });
}
