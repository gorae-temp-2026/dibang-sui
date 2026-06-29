import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createLoungeCheckInMutation } from '@gorae/contracts/@tanstack/react-query.gen';
import { useOnchainCheckIn } from '../../hooks/useOnchainCheckIn';

/**
 * 라운지 진입 시 LoungeCheckIn를 1회 자동 생성한다.
 * - 동일 loungeId에 대해 마운트 1회만 호출되도록 ref 가드.
 * - 실패는 무시(과거 직호출 패턴 유지). 진입 자체를 막지 않는다.
 *
 * V1 LoungeFeedPage / V2 LoungeV2Page에서 공유하는 부수효과를 추출한 훅.
 *
 * ⚠️ TRANSITIONAL — 온체인 = 참석(participate) 기록의 SSOT. DB 체크인과 함께 best-effort로 온체인
 *   event::participate를 1회 발행한다(useOnchainCheckIn 내부에서 멱등 — 기존 참가가 있으면 무동작).
 *   입장 게이트(LoungeCheckInGatePage)를 거치지 않고 라운지로 직접 온 경우, 또는 온체인 기능 도입 이전에
 *   체크인한 사용자의 participate backfill 경로.
 */
export function useEnsureLoungeCheckIn(loungeId: string | undefined) {
  const mutation = useMutation(createLoungeCheckInMutation());
  const participateOnchain = useOnchainCheckIn();
  const createdRef = useRef(false);
  const { mutate } = mutation;

  useEffect(() => {
    if (!loungeId || createdRef.current || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loungeId)) return;
    createdRef.current = true;
    mutate(
      { path: { loungeId } },
      {
        // DB 체크인 성공/실패와 무관하게(이미 체크인됨 포함) 온체인 participate를 best-effort 1회 시도.
        onSettled: () => {
          void participateOnchain(loungeId);
        },
      },
    );
  }, [loungeId, mutate, participateOnchain]);

  return mutation;
}
