import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAnnouncement } from '@gorae/contracts/sdk.gen';
import {
  listAnnouncementsQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

interface DeleteAnnouncementParams {
  announcementId: string;
  loungeId: string;
}

export function useDeleteAnnouncement(loungeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteAnnouncementParams) => {
      await deleteAnnouncement({
        path: { announcementId: params.announcementId },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listAnnouncementsQueryKey({ path: { loungeId } }) });
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }) });
    },
  });
}
