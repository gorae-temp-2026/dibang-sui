// useCredit — 온체인 신호(signal::SignalEmitted)를 읽어 지갑별 신용을 계산하는 *읽기* 훅.
//
// ✅ 아키텍처 의도(온체인=SSOT)의 *읽기 방향* 배선: 신뢰/신용의 단일 진실원천은 온체인이다. 이 훅은 DB를
// 거치지 않고 온체인(SDK getSignalEvents = RPC/indexer)에서 분류된 신호를 읽어 신용을 낸다 — 분류=온체인
// (signal.move), 집계=오프체인(credit.ts). 전환기 DB-first(useSaveInvitation 등)의 *반대 방향*이자 그 이관 목표의 일부.
// 상세: _architecture/SUI_CONTRACT_DESIGN_DIRECTION §10-B / CLAUDE.md 상단 SSOT 배너.
import { useQuery } from '@tanstack/react-query';
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/events/signals).
import { getOnchainSignals } from '@gorae/contracts/sdk.gen';
import { creditFromSignals, signalBreakdownFor, SOURCE, type CreditResult } from '../lib/credit';

/** 온체인 신호 전체 → 지갑별 신용 맵(0~1) + 구성요소. */
export function useCredit() {
  return useQuery({
    queryKey: ['onchain-credit'],
    queryFn: async (): Promise<CreditResult> => {
      // OnchainSignal(eventId·ts 포함)은 SignalEvent의 상위집합 → 그대로 집계에 투입.
      const signals = (await getOnchainSignals({ throwOnError: true })).data ?? [];
      return creditFromSignals(signals);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** 특정 지갑 주소의 신용(+구성요소 busu/cs/perf). address 없으면 undefined. */
export function useWalletCredit(address?: string) {
  const query = useCredit();
  const credit = address ? (query.data?.credit[address] ?? 0) : undefined;
  const components = address ? query.data?.components[address] : undefined;
  return { ...query, credit, components };
}

/** 내 프로필 표시용 통계 — 온체인 신호에서 신용 점수·이음 수·참여 수·중심성 백분위를 한 번에 계산. */
export interface MyCreditStats {
  /** 신뢰 점수(표시 스케일 0~1000 = 신용 0~1 × 1000 반올림). */
  score: number;
  /** 받은 이음(매칭) 수. */
  ieum: number;
  /** 함께한 이벤트(참석) 수. */
  events: number;
  /** 네트워크 중심성 백분위("상위 N%"). 신호 있는 노드 중 내 신용 순위. 없으면 null. */
  topPercent: number | null;
  /** 표시할 실데이터가 있나(신호 0이면 false → 데모/플레이스홀더 처리). */
  hasData: boolean;
}

/**
 * 내 온체인 신용 통계(읽기 전용, 게이트/배포 무관 — SignalEmitted만 읽음).
 * address 없으면 비활성. 신호가 아직 없으면 hasData=false(0 표시).
 */
export function useMyCreditStats(address?: string) {
  return useQuery({
    queryKey: ['onchain-credit-stats', address ?? ''],
    enabled: !!address,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MyCreditStats> => {
      const signals = (await getOnchainSignals({ throwOnError: true })).data ?? [];
      const result = creditFromSignals(signals);
      const breakdown = signalBreakdownFor(signals, address!);
      // "함께한 이벤트" = 내가 *보낸* 참석(ATTEND) 신호 수. breakdown.참석은 *받은* 것(혼주 기준)이라 부적합.
      const events = signals.filter((s) => s.from === address && s.source === SOURCE.ATTEND).length;
      const credit = result.credit[address!] ?? 0;
      // 중심성 = 신용 내림차순 순위의 백분위(1위 = 상위 0~, 꼴찌 = 상위 100%).
      const ranked = Object.values(result.credit).sort((a, b) => b - a);
      const total = ranked.length;
      const rank = ranked.findIndex((v) => v <= credit); // credit 이상인 노드 수 = 내 위치
      const topPercent = total > 0 && credit > 0 ? Math.max(1, Math.round(((rank + 1) / total) * 100)) : null;
      return {
        score: Math.round(credit * 1000),
        ieum: breakdown.매칭,
        events,
        topPercent,
        hasData: breakdown.total > 0 || credit > 0 || events > 0,
      };
    },
  });
}
