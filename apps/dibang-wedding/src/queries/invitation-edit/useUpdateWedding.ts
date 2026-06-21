import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWedding, updateInvitation } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey, getWeddingQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { UpdateWeddingRequest, UpdateInvitationRequest } from '@gorae/contracts';

export interface UpdateWeddingPayload {
  weddingReq: UpdateWeddingRequest;
  invitationReq: UpdateInvitationRequest;
}

export function useUpdateWedding(weddingId: string, invitationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weddingReq, invitationReq }: UpdateWeddingPayload) => {
      await updateWedding({
        path: { weddingId },
        body: weddingReq,
        throwOnError: true,
      });

      const hasInvitationData = invitationReq.gallery_photos
        || invitationReq.cover_image
        || invitationReq.custom_message
        || invitationReq.design_template_id
        || invitationReq.design_config
        || invitationReq.cover_text_config;

      if (hasInvitationData && invitationId) {
        await updateInvitation({
          path: { weddingId, invitationId },
          body: invitationReq,
          throwOnError: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getWeddingQueryKey({ path: { weddingId } }) });
    },
  });
}
