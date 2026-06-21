// ⚠️ TRANSITIONAL(전환기) — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding 데이터의 SSOT, DB(Go/Supabase)는 보조.
// 이 파일이 DB(Supabase) 먼저 저장 후 온체인을 dual-write로 얹는 건 *전환기*일 뿐 "DB 우선"이 아니다.
// 목표(미완): 앱을 온체인(RPC/indexer) 읽기로 이관. 트러스트 진실은 온체인에서 확인. 상세: CLAUDE.md 상단 SSOT 배너.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWedding, updateInvitation, updateWeddingSuiIds } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { CreateWeddingRequest, UpdateInvitationRequest } from '@gorae/contracts';
import type { SuiNetwork } from '@gorae/sui-sdk';
import { useOnchainHostActions } from '../../hooks/useOnchainHostActions';
import { useZkLogin } from '../../providers/ZkLoginProvider';
import { env } from '../../env';
import { extractWeddingObjectIds, type WeddingObjectIds } from './onchainWedding';

export interface SaveInvitationPayload {
  weddingReq: CreateWeddingRequest;
  invitationReq: UpdateInvitationRequest;
}

export interface SaveInvitationResult {
  wedding: { id: string; invitations: { id: string }[] };
  suiIds: WeddingObjectIds | null;
  onchainError?: string;
}

const PENDING_KEY = (id: string) => `dibang.onchain-pending.${id}`;

interface PendingOnchain {
  weddingDigest: string;
  vaultDigest?: string;
}

function loadPending(dbId: string): PendingOnchain | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY(dbId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePending(dbId: string, data: PendingOnchain) {
  localStorage.setItem(PENDING_KEY(dbId), JSON.stringify(data));
}

function clearPending(dbId: string) {
  localStorage.removeItem(PENDING_KEY(dbId));
}

export function useSaveInvitation() {
  const queryClient = useQueryClient();
  const { createWedding: createWeddingOnchain, createVault: createVaultOnchain } = useOnchainHostActions();
  const { isAuthenticated } = useZkLogin();

  return useMutation({
    mutationFn: async ({ weddingReq, invitationReq }: SaveInvitationPayload): Promise<SaveInvitationResult> => {
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
      let suiIds: WeddingObjectIds | null = null;
      let onchainError: string | undefined;
      if (isAuthenticated) {
        try {
          const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet';
          const pending = loadPending(wedding.id);

          const digest = pending?.weddingDigest ?? await createWeddingOnchain();
          savePending(wedding.id, { weddingDigest: digest });

          const ids = await extractWeddingObjectIds(digest, network);

          let vaultId = '';
          try {
            const vDigest = pending?.vaultDigest
              ?? await createVaultOnchain({ weddingId: ids.weddingId, capId: ids.capId });
            savePending(wedding.id, { weddingDigest: digest, vaultDigest: vDigest });
            vaultId = (await extractWeddingObjectIds(vDigest, network)).vaultId;
          } catch (e) {
            console.error('[온체인] createVault 실패 — vault 없이 저장:', e);
          }

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
          clearPending(wedding.id);
        } catch (e) {
          onchainError = e instanceof Error ? e.message : '온체인 기록에 실패했습니다.';
          console.error('[온체인] dual-write 실패 — Supabase 유지, 복구용 digest localStorage 보존:', e);
        }
      }

      return { wedding, suiIds, onchainError };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
    },
  });
}
