import { useEffect, useState } from 'react';

/**
 * 입력 값을 일정 시간(ms) 동안 변경 없을 때만 반영하는 디바운스 훅.
 * 텍스트 입력 중 매 타자마다 query를 보내지 않도록 입력 안정 후에만
 * 다운스트림 훅(예: useQuery enabled)에 흘려보낸다.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
