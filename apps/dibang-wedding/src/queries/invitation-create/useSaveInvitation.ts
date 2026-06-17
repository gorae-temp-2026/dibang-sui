import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWedding, updateInvitation } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { CreateWeddingRequest, UpdateInvitationRequest } from '@gorae/contracts';
import type { CreateWeddingParams, SuiNetwork } from '@gorae/sui-sdk';
import { useOnchainHostActions } from '../../hooks/useOnchainHostActions';
import { useZkLogin } from '../../providers/ZkLoginProvider';
import { env } from '../../env';
import { extractWeddingObjectIds, type WeddingObjectIds } from './onchainWedding';

export interface SaveInvitationPayload {
  weddingReq: CreateWeddingRequest;
  invitationReq: UpdateInvitationRequest;
  /** 온체인 createWedding 인자(owner 제외 — hook이 주입). 폼에서 toCreateWeddingParams로 생성. */
  onchainParams: Omit<CreateWeddingParams, 'owner'>;
}

export function useSaveInvitation() {
  const queryClient = useQueryClient();
  const { createWedding: createWeddingOnchain } = useOnchainHostActions();
  const { isAuthenticated } = useZkLogin();

  return useMutation({
    mutationFn: async ({ weddingReq, invitationReq, onchainParams }: SaveInvitationPayload) => {
      // Step 1: Supabase createWedding → weddingId 확보 (D0-1: Supabase 먼저)
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

      // Step 3: 온체인 createWedding (D0-1: dual-write).
      // 온체인이 실패해도 Supabase 생성은 유지하고 sui_id는 null로 두어 추후 재시도한다
      // — 결혼식 생성 자체를 막지 않는다.
      let suiIds: WeddingObjectIds | null = null;
      if (isAuthenticated) {
        try {
          const digest = await createWeddingOnchain(onchainParams);
          suiIds = await extractWeddingObjectIds(
            digest,
            (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet',
          );
          // TODO(C7-4): suiIds를 Supabase wedding row(sui_wedding_id 등)에 저장.
        } catch (e) {
          console.error('[온체인] createWedding 실패 — Supabase 유지, sui_id=null(재시도 가능):', e);
        }
      }

      return { wedding, suiIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
    },
  });
}
