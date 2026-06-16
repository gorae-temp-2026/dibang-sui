import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFeedComment } from '@gorae/contracts/sdk.gen';
import {
  listFeedCommentsQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';

interface DeleteCommentParams {
  commentId: string;
  targetType: string;
  targetId: string;
  loungeId: string;
}

export function useDeleteFeedComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteCommentParams) => {
      await deleteFeedComment({
        path: { commentId: params.commentId },
        throwOnError: true,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: listFeedCommentsQueryKey({ query: { target_type: variables.targetType as 'guestbook_entry' | 'host_announcement', target_id: variables.targetId } }),
      });
      queryClient.invalidateQueries({ queryKey: listFeedInfiniteQueryKey({ path: { loungeId: variables.loungeId } }) });
    },
  });
}
