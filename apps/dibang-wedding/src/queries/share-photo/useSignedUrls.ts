import { useQuery } from '@tanstack/react-query';
import { listSharedPhotoSignedUrls } from '../../lib/sharedPhotoUrl';

/**
 * shared_photos.storage_path 배열을 Supabase signed URL 배열로 변환하는 React Query 훅.
 * (UI/데이터 분리 3-I: page가 lib helper를 직접 await하던 패턴을 데이터 훅 경유로 캡슐화)
 *
 * signed URL은 TTL 1시간이라 캐시 가치가 있음. paths 배열을 query key로 써서
 * 같은 paths에 대한 재조회는 캐시 hit.
 */
export function useSignedUrls(storagePaths: string[] | null | undefined) {
  return useQuery({
    queryKey: ['shared-photo-signed-urls', storagePaths ?? []],
    queryFn: async () => {
      if (!storagePaths || storagePaths.length === 0) return [] as Array<string | undefined>;
      return listSharedPhotoSignedUrls(storagePaths);
    },
    enabled: !!storagePaths,
    staleTime: 30 * 60 * 1000, // 30분 (signed URL TTL 1시간 절반)
  });
}
