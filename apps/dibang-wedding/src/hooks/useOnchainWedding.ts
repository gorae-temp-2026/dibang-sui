// useOnchainWedding — 온체인 Wedding 앵커(신뢰 구조)를 *온체인에서* 읽는 훅.
//
// ✅ 아키텍처 의도(온체인=SSOT)의 읽기 방향 배선(#43 온체인-읽기 이관의 데이터 층).
// 신뢰/구조(혼주 지갑·event_id·vault·status)의 단일 진실원천은 온체인이다 → 이 훅은 DB가 아니라
// 온체인(SDK getWedding = RPC)에서 읽는다. 표시콘텐츠(신랑·신부·부모 이름·예식장·날짜, 결정A)는 온체인에
// 없으므로 그대로 DB(Supabase/Go API)에서 읽는다 — 둘을 합성해 청첩장을 렌더한다.
// 상세: _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언·§10-A / CLAUDE.md 상단 SSOT 배너.
import { useQuery } from '@tanstack/react-query';
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainWedding, getOnchainVault } from '@gorae/contracts/sdk.gen';
import type { OnchainWedding, OnchainCashGiftVault } from '@gorae/contracts';

/** 온체인 Wedding 앵커(혼주·event_id·vault·status) — 신뢰/구조 SSOT. weddingId 없으면 비활성. */
export function useOnchainWedding(weddingId?: string) {
  return useQuery({
    queryKey: ['onchain-wedding', weddingId],
    enabled: !!weddingId,
    queryFn: async (): Promise<OnchainWedding | null> =>
      (await getOnchainWedding({ path: { weddingId: weddingId! }, throwOnError: true })).data ?? null,
    staleTime: 300_000, // 거의 불변(BE-3)
    refetchOnWindowFocus: false,
  });
}

/** 온체인 축의 모금함(실 SUI 잔액) — 부조 합계의 SSOT. vaultId 없으면 비활성. */
export function useOnchainVault(vaultId?: string) {
  return useQuery({
    queryKey: ['onchain-vault', vaultId],
    enabled: !!vaultId,
    queryFn: async (): Promise<OnchainCashGiftVault | null> =>
      (await getOnchainVault({ path: { vaultId: vaultId! }, throwOnError: true })).data ?? null,
    staleTime: 10_000, // give마다 변함(BE-3)
    refetchOnWindowFocus: false,
  });
}
