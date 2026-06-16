import { useQuery } from '@tanstack/react-query';
import { listFeedCommentsOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useGetFeedComments(targetType: string, targetId: string, enabled: boolean) {
  return useQuery({
    ...listFeedCommentsOptions({ query: { target_type: targetType as 'guestbook_entry' | 'host_announcement', target_id: targetId } }),
    enabled,
  });
}
