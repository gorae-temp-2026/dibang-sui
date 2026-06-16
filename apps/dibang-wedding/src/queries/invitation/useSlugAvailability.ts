import { useQuery } from '@tanstack/react-query';
import { getInvitationOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export type SlugAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/**
 * slug가 사용 가능한지 서버에 조회.
 * - slug 길이 < 2 또는 originalSlug 와 동일 → idle (조회 안 함)
 * - 조회 중 → checking
 * - 응답 OK + data 있음 → taken (이미 사용 중)
 * - 응답 404 → available
 * - 그 외 → error
 *
 * 호출자는 본 훅 호출 전에 useDebouncedValue 로 입력 디바운스를 적용해야 한다.
 */
export function useSlugAvailability(slug: string, originalSlug?: string): SlugAvailability {
  const skip = !slug || slug.length < 2 || (originalSlug !== undefined && slug === originalSlug);

  const query = useQuery({
    ...getInvitationOptions({ path: { slug } }),
    enabled: !skip,
    retry: false,
    staleTime: 0,
  });

  if (skip) return 'idle';
  if (query.isLoading) return 'checking';
  if (query.data) return 'taken';
  // 404 또는 error — react-query는 throwOnError가 아니면 isError로 표면화
  if (query.isError) {
    // 404 는 "사용 가능"으로 해석, 그 외 에러는 "error"
    const status = (query.error as { status?: number } | null)?.status;
    if (status === 404) return 'available';
    return 'error';
  }
  return 'available';
}
