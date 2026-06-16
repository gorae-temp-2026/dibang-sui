import { useQuery } from '@tanstack/react-query';
import { listLoungeCheckInsOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetLoungeCheckIns(placeId: string | undefined) {
  return useQuery({
    ...listLoungeCheckInsOptions({ path: { placeId: placeId! }, query: { limit: 100 } }),
    enabled: !!placeId,
    staleTime: 30 * 1000,
  });
}
