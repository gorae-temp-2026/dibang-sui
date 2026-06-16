import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createLoungeCheckInMutation } from '@gorae/contracts/@tanstack/react-query.gen';

/**
 * 라운지 진입 시 LoungeCheckIn를 1회 자동 생성한다.
 * - 동일 loungeId에 대해 마운트 1회만 호출되도록 ref 가드.
 * - 실패는 무시(과거 직호출 패턴 유지). 진입 자체를 막지 않는다.
 *
 * V1 LoungeFeedPage / V2 LoungeV2Page에서 공유하는 부수효과를 추출한 훅.
 */
export function useEnsureLoungeCheckIn(loungeId: string | undefined) {
  const mutation = useMutation(createLoungeCheckInMutation());
  const createdRef = useRef(false);
  const { mutate } = mutation;

  useEffect(() => {
    if (!loungeId || createdRef.current) return;
    createdRef.current = true;
    mutate({ path: { loungeId } });
  }, [loungeId, mutate]);

  return mutation;
}
