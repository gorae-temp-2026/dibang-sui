import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvitation, updateInvitation } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { UpdateInvitationRequest } from '@gorae/contracts';

export interface AddInvitationPayload {
  slug: string;
  invitationReq: UpdateInvitationRequest;
}

export function useAddInvitation(weddingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, invitationReq }: AddInvitationPayload) => {
      // Step 1: createInvitation → 기존 wedding에 invitation 추가
      const { data: inv } = await createInvitation({
        path: { weddingId },
        body: { slug },
        throwOnError: true,
      });

      // Step 2: updateInvitation (커버, 갤러리, 인사말, 템플릿)
      const hasData = invitationReq.gallery_photos
        || invitationReq.cover_image
        || invitationReq.custom_message
        || invitationReq.design_template_id
        || invitationReq.design_config
        || invitationReq.cover_text_config;

      if (hasData) {
        await updateInvitation({
          path: { weddingId, invitationId: inv.id },
          body: invitationReq,
          throwOnError: true,
        });
      }

      return inv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
    },
  });
}
