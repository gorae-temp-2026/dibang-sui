import { useQuery } from '@tanstack/react-query';
import { getLoungeOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetLounge(loungeId: string) {
  return useQuery({
    ...getLoungeOptions({ path: { loungeId } }),
    enabled: !!loungeId,
    staleTime: 5 * 60 * 1000,
  });
}
