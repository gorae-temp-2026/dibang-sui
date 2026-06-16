import { useEffect, type RefObject } from 'react';

/**
 * 지정된 ref 바깥 영역의 클릭을 감지해 콜백을 호출하는 UI 헬퍼.
 *
 * - enabled=false 면 리스너를 등록하지 않는다 (팝오버 닫힘 상태 등).
 * - deferRegistration=true (기본값) 이면 다음 틱에 리스너를 등록한다.
 *   팝오버를 여는 그 클릭 이벤트가 곧바로 외부 클릭으로 감지되어
 *   팝오버가 즉시 닫히는 현상을 방지하기 위함.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled = true,
  deferRegistration = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    let registered = false;

    const register = () => {
      document.addEventListener('click', handler);
      registered = true;
    };

    if (deferRegistration) {
      timer = setTimeout(register, 0);
    } else {
      register();
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (registered) document.removeEventListener('click', handler);
    };
  }, [ref, onOutside, enabled, deferRegistration]);
}
