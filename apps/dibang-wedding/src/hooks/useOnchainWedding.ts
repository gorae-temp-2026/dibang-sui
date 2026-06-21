// useOnchainWedding — 온체인 Wedding 앵커(신뢰 구조)를 *온체인에서* 읽는 훅.
//
// ✅ 아키텍처 의도(온체인=SSOT)의 읽기 방향 배선(#43 온체인-읽기 이관의 데이터 층).
// 신뢰/구조(혼주 지갑·event_id·vault·status)의 단일 진실원천은 온체인이다 → 이 훅은 DB가 아니라
// 온체인(SDK getWedding = RPC)에서 읽는다. 표시콘텐츠(신랑·신부·부모 이름·예식장·날짜, 결정A)는 온체인에
// 없으므로 그대로 DB(Supabase/Go API)에서 읽는다 — 둘을 합성해 청첩장을 렌더한다.
// 상세: _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언·§10-A / CLAUDE.md 상단 SSOT 배너.
import { useQuery } from '@tanstack/react-query';
import {
  createJsonRpcClient,
  getWedding,
  getCashGiftVault,
  type SuiNetwork,
  type WeddingOnChain,
  type CashGiftVaultOnChain,
} from '@gorae/sui-sdk';
import { env } from '../env';

const network = (): SuiNetwork => (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet';

/** 온체인 Wedding 앵커(혼주·event_id·vault·status) — 신뢰/구조 SSOT. weddingId 없으면 비활성. */
export function useOnchainWedding(weddingId?: string) {
  return useQuery({
    queryKey: ['onchain-wedding', weddingId, network()],
    enabled: !!weddingId,
    queryFn: async (): Promise<WeddingOnChain | null> =>
      getWedding(createJsonRpcClient(network()), weddingId!),
    staleTime: 30_000,
  });
}

/** 온체인 축의 모금함(실 SUI 잔액) — 부조 합계의 SSOT. vaultId 없으면 비활성. */
export function useOnchainVault(vaultId?: string) {
  return useQuery({
    queryKey: ['onchain-vault', vaultId, network()],
    enabled: !!vaultId,
    queryFn: async (): Promise<CashGiftVaultOnChain | null> =>
      getCashGiftVault(createJsonRpcClient(network()), vaultId!),
    staleTime: 30_000,
  });
}
