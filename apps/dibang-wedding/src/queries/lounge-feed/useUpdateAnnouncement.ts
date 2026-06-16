import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateAnnouncementMutation,
  listAnnouncementsQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

export function useUpdateAnnouncement(loungeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    ...updateAnnouncementMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listAnnouncementsQueryKey({ path: { loungeId } }),
      });
      queryClient.invalidateQueries({ queryKey: ['loungeFeed', loungeId] });
    },
  });
}
