import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * navigator.clipboard 래퍼 훅. 복사 성공 시 `isCopied`가 일정 시간 동안 true.
 *
 * UI/데이터 분리 P1-2: guest-web hooks/useCopyToClipboard.ts에서 packages/web-utils로 승격.
 * dibang-wedding의 WeddingCard·HostSlotSectionContainer가 navigator.clipboard를 직접 호출하던
 * 패턴을 같은 훅으로 캡슐화한다.
 *
 * SSR 가드: 호출 시점에 navigator 부재면 false 반환.
 *
 * @param resetMs 복사 성공 후 isCopied가 false로 돌아가기까지의 시간(ms). 기본 2000.
 */
export function useCopyToClipboard(resetMs: number = 2000) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(async (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsCopied(false), resetMs);
      return true;
    } catch {
      return false;
    }
  }, [resetMs]);

  return { isCopied, copy };
}
