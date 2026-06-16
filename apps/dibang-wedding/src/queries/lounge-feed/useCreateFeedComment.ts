import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFeedComment } from '@gorae/contracts/sdk.gen';
import {
  listFeedCommentsQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

interface CreateCommentParams {
  targetType: string;
  targetId: string;
  message: string;
  loungeId: string;
}

export function useCreateFeedComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCommentParams) => {
      const { data } = await createFeedComment({
        body: {
          target_type: params.targetType as 'guestbook_entry' | 'host_announcement',
          target_id: params.targetId,
          message: params.message,
        },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: listFeedCommentsQueryKey({ query: { target_type: variables.targetType as 'guestbook_entry' | 'host_announcement', target_id: variables.targetId } }),
      });
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId: variables.loungeId } }) });
    },
  });
}
