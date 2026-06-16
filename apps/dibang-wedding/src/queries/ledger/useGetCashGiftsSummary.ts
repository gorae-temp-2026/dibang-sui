import { useQuery } from '@tanstack/react-query';
import { getCashGiftsSummaryOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetCashGiftsSummary(weddingId: string | undefined) {
  return useQuery({
    ...getCashGiftsSummaryOptions({ path: { weddingId: weddingId! } }),
    enabled: !!weddingId,
  });
}
