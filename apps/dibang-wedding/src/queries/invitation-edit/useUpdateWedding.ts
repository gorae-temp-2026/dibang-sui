// ⚠️ TRANSITIONAL(전환기) — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding 데이터의 SSOT, DB(Go/Supabase)는 보조.
// 이 파일이 DB(Supabase) 먼저 저장 후 온체인을 dual-write로 얹는 건 *전환기*일 뿐 "DB 우선"이 아니다.
// 목표(미완): 앱을 온체인(RPC/indexer) 읽기로 이관. 상세: CLAUDE.md 상단 SSOT 배너.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWedding, updateInvitation, getWedding } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsQueryKey, getWeddingQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { UpdateWeddingRequest, UpdateInvitationRequest } from '../../types/db-compat';
import {
  buildUpdateInvitationTx,
  walrusStore,
  walrusStoreString,
  walrusStorePIIString,
  getInvitationForWedding,
  createJsonRpcClient,
  configureSui,
  ONCHAIN_BLOB_EPOCHS,
  type SuiNetwork,
} from '@gorae/sui-sdk';
import { useZkLogin } from '../../providers/ZkLoginProvider';
import { env } from '../../env';

export interface UpdateWeddingPayload {
  weddingReq: UpdateWeddingRequest;
  invitationReq: UpdateInvitationRequest;
}

/** 커버 사진 URL(Supabase) → 바이트 → Walrus blobId. 실패 시 ''(best-effort). 온체인 참조 블롭이라 내구 epoch. */
async function coverUrlToWalrusBlobId(url: string | undefined): Promise<string> {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const bytes = new Uint8Array(await res.arrayBuffer());
    return await walrusStore(bytes, { epochs: ONCHAIN_BLOB_EPOCHS });
  } catch {
    return '';
  }
}

export function useUpdateWedding(weddingId: string, invitationId: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated, executeOnchain } = useZkLogin();

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

      // 온체인 update_invitation dual-write (best-effort) — 생성(useSaveInvitation)과 짝이 되는 수정 경로.
      // 이름(신랑·신부, PII)·커버사진·인사말은 온체인 평문 금지(VISION §7) → Walrus blobId 참조만 싣는다.
      // ⚠️ update_invitation은 모든 필드를 교체한다 → 이번에 안 바뀐 필드는 기존 온체인 blobId/값으로 보존해야
      //    덮어쓰기로 데이터가 지워지지 않는다(부분 수정 안전).
      // 온체인에 반영할 게 있을 때만(청첩장 정보 변경 = info 또는 hasInvitationData) 실행 — hosts-only/무변경
      //    수정에 불필요한 가스·이벤트스캔·tx를 내지 않는다.
      // ⚠️ 알려진 한계(전환기): 에디터가 커버/인사말을 *삭제*하면 폼이 빈 값을 undefined로 보내(useInvitationForm)
      //    아래 보존 로직이 기존 blobId를 유지한다 → DB는 비어도 온체인엔 옛 참조가 남는 경미한 SSOT 불일치.
      //    완전 해소는 폼이 "삭제"를 빈 문자열('')로 명시 전달하도록 바꾸는 후속 과제.
      if (isAuthenticated && (weddingReq.info || hasInvitationData)) {
        try {
          // DB wedding → 온체인 Wedding 객체 ID(sui_wedding_id). 없으면 온체인 청첩장도 없음 → 생략.
          const { data: weddingRec } = await getWedding({ path: { weddingId }, throwOnError: true });
          const suiWeddingId = weddingRec?.sui_wedding_id;
          if (suiWeddingId) {
            const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet';
            if (env.VITE_SUI_PACKAGE_ID) configureSui({ network, packageId: env.VITE_SUI_PACKAGE_ID });
            const client = createJsonRpcClient(network);
            // 주최자(primary_host) 발행분 중 최신 온체인 Invitation(제3자 위조분 거름).
            const inv = await getInvitationForWedding(client, suiWeddingId);
            if (inv?.id) {
              const info = weddingReq.info;
              const groomNameBlobId = info?.groom_name?.trim()
                ? await walrusStorePIIString(info.groom_name, { epochs: ONCHAIN_BLOB_EPOCHS })
                : inv.groomNameBlobId;
              const brideNameBlobId = info?.bride_name?.trim()
                ? await walrusStorePIIString(info.bride_name, { epochs: ONCHAIN_BLOB_EPOCHS })
                : inv.brideNameBlobId;
              const date = info?.date ?? inv.date;
              const time = info?.time ?? inv.time;
              const venueName = info?.venue?.venue_name ?? inv.venueName;
              const venueHall = info?.venue?.venue_hall ?? inv.venueHall;
              // 커버: 새 URL이 들어왔고 Walrus 업로드 성공 시에만 교체. 실패·미변경이면 기존 blobId 보존.
              let coverPhotoBlobId = inv.coverPhotoBlobId;
              if (invitationReq.cover_image) {
                const newBlob = await coverUrlToWalrusBlobId(invitationReq.cover_image as string);
                if (newBlob) coverPhotoBlobId = newBlob;
              }
              // 인사말: custom_message 키가 들어왔으면 교체(빈 문자열은 비우기), 없으면 기존 보존.
              let greeting = inv.greetingBlobId;
              if (invitationReq.custom_message !== undefined) {
                const raw = (invitationReq.custom_message as string) ?? '';
                greeting = raw.trim() ? await walrusStoreString(raw, { epochs: ONCHAIN_BLOB_EPOCHS }) : '';
              }
              await executeOnchain(
                buildUpdateInvitationTx({
                  invitationId: inv.id,
                  groomNameBlobId,
                  brideNameBlobId,
                  date,
                  time,
                  venueName,
                  venueHall,
                  coverPhotoBlobId,
                  greeting,
                }),
              );
            }
          }
        } catch (e) {
          console.error('[온체인] update_invitation 실패 — 표시용 DB는 유지:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getWeddingQueryKey({ path: { weddingId } }) });
    },
  });
}
