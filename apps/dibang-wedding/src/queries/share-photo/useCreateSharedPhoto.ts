import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSharedPhotoMutation,
  listSharedPhotosQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

export function useCreateSharedPhoto(loungeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    ...createSharedPhotoMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listSharedPhotosQueryKey({ path: { loungeId } }),
      });
    },
  });
}
