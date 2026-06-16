import { useQuery } from '@tanstack/react-query';
import { listAnnouncementsOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetAnnouncements(loungeId: string) {
  return useQuery({
    ...listAnnouncementsOptions({ path: { loungeId } }),
    enabled: !!loungeId,
  });
}
