import { useQuery } from '@tanstack/react-query';
import { listSharedPhotosOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useListSharedPhotos(loungeId: string | undefined) {
  return useQuery({
    ...listSharedPhotosOptions({ path: { loungeId: loungeId! } }),
    enabled: !!loungeId,
  });
}
