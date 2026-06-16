/**
 * 청첩장 사진 1장 등록 mutation 훅.
 *
 * UI/데이터 분리 라운드 3 A3: useUploadInvitationPhotos가 onUploaded 콜백에서 SDK
 * (createMobileInvitationPhoto)를 직접 호출하던 패턴을 mutation 경유로 분리.
 * 캐시 무효화는 mutation 안에서 자동 처리.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMobileInvitationPhoto } from '@gorae/contracts/sdk.gen';
import { listMobileInvitationPhotosQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

export interface CreateMobileInvitationPhotoVariables {
  subKind: 'cover' | 'gallery';
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sortOrder: number;
}

export function useCreateMobileInvitationPhoto(weddingId: string, invitationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (v: CreateMobileInvitationPhotoVariables) => {
      await createMobileInvitationPhoto({
        path: { weddingId, invitationId },
        body: {
          sub_kind: v.subKind,
          storage_path: v.storagePath,
          file_name: v.fileName,
          file_size: v.fileSize,
          mime_type: v.mimeType,
          sort_order: v.sortOrder,
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: listMobileInvitationPhotosQueryKey({
          path: { weddingId, invitationId },
        }),
      });
    },
  });
}
