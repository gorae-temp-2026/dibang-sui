/**
 * 호스트 웨딩 온체인 생성 유틸 (C6).
 * - toCreateWeddingParams: 청첩장 폼 상태 → 온체인 createWedding 인자(owner는 hook이 주입).
 * - extractWeddingObjectIds: createWedding digest → 발행된 Sui 오브젝트 ID 추출.
 *
 * 실제 생성 경로(InvitationCreatePage → useSaveInvitation)에서 쓰이는 유틸이다. DEV 패널 아님.
 */
import { createJsonRpcClient, type CreateWeddingParams, type SuiNetwork } from '@gorae/sui-sdk';
import type { InvitationFormState } from '../../hooks/invitation-create/useInvitationForm';

/** 폼 상태 → 온체인 createWedding 인자(owner는 useOnchainHostActions가 주입하므로 제외). */
export function toCreateWeddingParams(
  state: InvitationFormState,
): Omit<CreateWeddingParams, 'owner'> {
  const groom = state.groomName.trim() || '신랑';
  const bride = state.brideName.trim() || '신부';
  return {
    groomName: state.groomName,
    brideName: state.brideName,
    groomFatherName: state.groomFatherName || undefined,
    groomMotherName: state.groomMotherName || undefined,
    brideFatherName: state.brideFatherName || undefined,
    brideMotherName: state.brideMotherName || undefined,
    date: state.date,
    time: state.time,
    venueName: state.venueName,
    venueAddress: state.venueAddress,
    venueHall: state.venueHall || undefined,
    // 폼에 라운지명 입력이 없으므로 신랑♥신부 규칙으로 생성.
    loungeName: `${groom}♥${bride} 라운지`,
  };
}

export interface WeddingObjectIds {
  weddingId: string;
  loungeId: string;
  capId: string;
  vaultId: string;
}

/**
 * createWedding 트랜잭션 digest로부터 발행된 오브젝트 ID를 추출한다.
 * 'Wedding'은 WeddingLounge/WeddingCap의 substring이므로 반드시 endsWith로 정확 매칭한다
 * (includes를 쓰면 Wedding/Lounge/Cap이 서로 오추출됨).
 * Vault는 createWedding이 아니라 createVault에서 발행되므로 여기선 보통 빈 문자열이다.
 */
export async function extractWeddingObjectIds(
  digest: string,
  network: SuiNetwork = 'testnet',
): Promise<WeddingObjectIds> {
  const client = createJsonRpcClient(network);
  const txb = await client.getTransactionBlock({
    digest,
    options: { showObjectChanges: true },
  });
  const changes = txb.objectChanges;
  const pick = (suffix: string): string => {
    const c = changes?.find(
      (o) => o.type === 'created' && o.objectType.endsWith(suffix),
    );
    return c && 'objectId' in c ? c.objectId : '';
  };
  return {
    weddingId: pick('::wedding::Wedding'),
    loungeId: pick('::wedding::WeddingLounge'),
    capId: pick('::wedding::WeddingCap'),
    vaultId: pick('::cash_gift::CashGiftVault'),
  };
}
