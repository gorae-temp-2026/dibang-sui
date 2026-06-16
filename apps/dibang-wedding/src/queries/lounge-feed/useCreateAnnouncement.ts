import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAnnouncementMutation,
  listAnnouncementsQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

export function useCreateAnnouncement(loungeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    ...createAnnouncementMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listAnnouncementsQueryKey({ path: { loungeId } }) });
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }) });
    },
  });
}
