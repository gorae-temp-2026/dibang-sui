// useCredit — 온체인 신호(signal::SignalEmitted)를 읽어 지갑별 신용을 계산하는 *읽기* 훅.
//
// ✅ 아키텍처 의도(온체인=SSOT)의 *읽기 방향* 배선: 신뢰/신용의 단일 진실원천은 온체인이다. 이 훅은 DB를
// 거치지 않고 온체인(SDK getSignalEvents = RPC/indexer)에서 분류된 신호를 읽어 신용을 낸다 — 분류=온체인
// (signal.move), 집계=오프체인(credit.ts). 전환기 DB-first(useSaveInvitation 등)의 *반대 방향*이자 그 이관 목표의 일부.
// 상세: _architecture/SUI_CONTRACT_DESIGN_DIRECTION §10-B / CLAUDE.md 상단 SSOT 배너.
import { useQuery } from '@tanstack/react-query';
import { createJsonRpcClient, getSignalEvents, type SuiNetwork } from '@gorae/sui-sdk';
import { creditFromSignals, type CreditResult } from '../lib/credit';
import { env } from '../env';

const network = (): SuiNetwork => (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet';

/** 온체인 신호 전체 → 지갑별 신용 맵(0~1) + 구성요소. */
export function useCredit() {
  const net = network();
  return useQuery({
    queryKey: ['onchain-credit', net],
    queryFn: async (): Promise<CreditResult> => {
      const client = createJsonRpcClient(net);
      // SignalQuery(eventId·ts 포함)는 SignalEvent의 상위집합 → 그대로 집계에 투입.
      const signals = await getSignalEvents(client);
      return creditFromSignals(signals);
    },
    staleTime: 60_000,
  });
}

/** 특정 지갑 주소의 신용(+구성요소 busu/cs/perf). address 없으면 undefined. */
export function useWalletCredit(address?: string) {
  const query = useCredit();
  const credit = address ? (query.data?.credit[address] ?? 0) : undefined;
  const components = address ? query.data?.components[address] : undefined;
  return { ...query, credit, components };
}
