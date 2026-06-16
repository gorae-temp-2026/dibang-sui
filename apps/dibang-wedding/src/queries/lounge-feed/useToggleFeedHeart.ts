import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleFeedHeart } from '@gorae/contracts/sdk.gen';
import { listFeedInfiniteQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

interface ToggleHeartParams {
  targetType: string;
  targetId: string;
  loungeId: string;
}

export function useToggleFeedHeart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ToggleHeartParams) => {
      const { data } = await toggleFeedHeart({
        body: {
          target_type: params.targetType as 'guestbook_entry' | 'host_announcement',
          target_id: params.targetId,
        },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId: variables.loungeId } }) });
    },
  });
}
