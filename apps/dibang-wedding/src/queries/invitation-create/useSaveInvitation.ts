import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWedding, updateInvitation } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { CreateWeddingRequest, UpdateInvitationRequest } from '@gorae/contracts';

export interface SaveInvitationPayload {
  weddingReq: CreateWeddingRequest;
  invitationReq: UpdateInvitationRequest;
}

export function useSaveInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weddingReq, invitationReq }: SaveInvitationPayload) => {
      // Step 1: createWedding → weddingId 획득
      const { data: wedding } = await createWedding({
        body: weddingReq,
        throwOnError: true,
      });

      // Step 2: updateInvitation (사진, 인사말, 템플릿)
      const hasInvitationData = invitationReq.gallery_photos
        || invitationReq.cover_image
        || invitationReq.custom_message
        || invitationReq.design_template_id
        || invitationReq.design_config
        || invitationReq.cover_text_config;

      if (hasInvitationData) {
        await updateInvitation({
          path: { weddingId: wedding.id, invitationId: wedding.invitations[0]?.id ?? '' },
          body: invitationReq,
          throwOnError: true,
        });
      }

      return wedding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
    },
  });
}
