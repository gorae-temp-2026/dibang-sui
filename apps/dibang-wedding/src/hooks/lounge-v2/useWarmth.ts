import { useMemo } from 'react';
import type { FeedItem } from '../../types/db-compat';
import { computeWarmth } from '../../lib/loungeV2Feed';

// 활동량 기반 체온°(우리의 온기). 서버 의존 없는 순수 파생값이라 hooks/.
// 핸드오프 §3: 클라 계산만으로 충분, 활동 카운트 변화 시 자동 재계산.
export function useWarmth(items: FeedItem[]): { value: number; label: string } {
  return useMemo(() => {
    const value = computeWarmth(items);
    return { value, label: `${value.toFixed(1)}°` };
  }, [items]);
}
