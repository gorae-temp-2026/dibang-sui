import { useQuery } from '@tanstack/react-query';
import { getWeddingOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetWedding(weddingId: string | undefined) {
  return useQuery({
    ...getWeddingOptions({ path: { weddingId: weddingId! } }),
    enabled: !!weddingId,
    staleTime: 5 * 60 * 1000,
  });
}
