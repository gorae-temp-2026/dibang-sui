import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWedding, updateInvitation, updateWeddingSuiIds } from '@gorae/contracts/sdk.gen';
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
  const { createWedding: createWeddingOnchain, createVault: createVaultOnchain } = useOnchainHostActions();
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
          const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet';
          const digest = await createWeddingOnchain(onchainParams);
          const ids = await extractWeddingObjectIds(digest, network);
          // C10-1: 축의 Vault 생성(capId로) → vaultId 추출. 실패해도 wedding/lounge는 저장(흐름 유지).
          let vaultId = '';
          try {
            const vaultDigest = await createVaultOnchain({ weddingId: ids.weddingId, capId: ids.capId });
            vaultId = (await extractWeddingObjectIds(vaultDigest, network)).vaultId;
          } catch (e) {
            console.error('[온체인] createVault 실패 — vault 없이 저장:', e);
          }
          // C7-4·C10-1: 발행된 Sui ID(wedding/lounge/vault)를 Supabase row에 dual-write 저장.
          await updateWeddingSuiIds({
            path: { weddingId: wedding.id },
            body: {
              sui_wedding_id: ids.weddingId || null,
              sui_lounge_id: ids.loungeId || null,
              sui_vault_id: vaultId || null,
            },
            throwOnError: true,
          });
          suiIds = { ...ids, vaultId };
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
