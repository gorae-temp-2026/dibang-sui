import { useEffect, useRef } from 'react';

/**
 * 외부 앱(토스/카카오페이 등) 딥링크로 떠난 사용자가 브라우저로 돌아왔을 때
 * 1회 콜백을 실행한다.
 *
 * - `visibilitychange`(visible) / `focus` / `pageshow` 3개 이벤트를 함께 구독해
 *   모바일/PC 모두에서 복귀를 잡는다.
 * - `markWaiting()` 호출 후 복귀 이벤트가 들어와야 콜백이 발사된다.
 *   호출 안 한 상태의 자연스러운 탭 전환에서는 발사되지 않는다.
 *
 * StepTransfer 분리용(W06 #10).
 */
export function useDeepLinkReturn(onReturn: () => void) {
  const waitingForReturn = useRef(false);
  // 매 렌더의 콜백을 ref로 잡아두어 effect 재구독을 피한다.
  // render 중 ref.current 갱신은 react-hooks/refs에 걸리므로 effect에서 동기화.
  const callbackRef = useRef(onReturn);
  useEffect(() => {
    callbackRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    function fire() {
      if (waitingForReturn.current) {
        waitingForReturn.current = false;
        callbackRef.current();
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fire();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', fire);
    window.addEventListener('pageshow', fire);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', fire);
      window.removeEventListener('pageshow', fire);
    };
  }, []);

  return {
    /** 딥링크 이동 직전에 호출. 복귀 이벤트 1회 대기 상태로 전환. */
    markWaiting: () => {
      waitingForReturn.current = true;
    },
  };
}
