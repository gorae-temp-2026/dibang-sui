import { useDebouncedValue } from '../shared/useDebouncedValue';
import { useSlugAvailability, type SlugAvailability } from '../../queries/invitation/useSlugAvailability';

const DEBOUNCE_MS = 500;

/**
 * slug 입력 디바운스 + 서버 조회 합성 훅.
 * - 입력 디바운스(500ms): useDebouncedValue
 * - 사용 가능 여부 조회: useSlugAvailability (queries/invitation/)
 *
 * 데이터 책임은 queries 레이어로 분리되고 본 훅은 두 책임을 합성하는 얇은 래퍼.
 * (UI/데이터 분리 1-E)
 */
export function useSlugCheck(slug: string, originalSlug?: string): SlugAvailability {
  const debouncedSlug = useDebouncedValue(slug, DEBOUNCE_MS);
  return useSlugAvailability(debouncedSlug, originalSlug);
}
