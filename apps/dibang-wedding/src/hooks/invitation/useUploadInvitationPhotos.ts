/**
 * 청첩장 사진 업로드 mutation 훅 (UI/데이터 분리 P3-8 + 라운드 3 A3).
 *
 * 시나리오 §10·§13:
 *   - presignedUpload(병렬 PUT) + onUploaded 콜백에서 useCreateMobileInvitationPhoto mutation 경유로 register chain
 *   - register 콜백 에러는 race-safe하게 첫 발생 메시지만 보존(firstErrorRef 패턴 유지)
 *   - PUT 자체 실패(results 내 Error)도 같은 우선순위 슬롯에서 합산
 *   - 성공/실패 후 listMobileInvitationPhotos 캐시 무효화는 useCreateMobileInvitationPhoto의 onSettled가 책임
 *
 * 호출자는 `mutate({ subKind, files, baseSort })`로 1회분 업로드 일괄 처리.
 * 결과 메시지(firstError)는 mutation의 data로 반환되어 UI가 직접 setError 할 수 있다.
 *
 * 라운드 3 A3 변경: onUploaded에서 contracts SDK 직접 호출 제거.
 * useCreateMobileInvitationPhoto mutation의 mutateAsync로 위임.
 */
import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { presignedUpload } from '../../lib/presignedUpload';
import { useCreateMobileInvitationPhoto } from '../../queries/invitation/useCreateMobileInvitationPhoto';

export interface UploadInvitationPhotosVariables {
  subKind: 'cover' | 'gallery';
  files: File[];
  /** gallery sort_order 시작값 (cover는 0 고정) */
  baseSort: number;
}

export interface UploadInvitationPhotosResult {
  /** onPick 1회분에서 처음 발생한 에러 메시지. 없으면 null. */
  firstError: string | null;
}

export function useUploadInvitationPhotos(weddingId: string, invitationId: string) {
  // onPick 1회분의 PUT+register 동시 처리에서 처음 발생한 에러 메시지만 보존 (옵션 A).
  // race-safe하게 useRef로 첫 값만 채운다.
  const firstErrorRef = useRef<string | null>(null);
  const { mutateAsync: createPhotoAsync } = useCreateMobileInvitationPhoto(weddingId, invitationId);

  return useMutation<UploadInvitationPhotosResult, Error, UploadInvitationPhotosVariables>({
    mutationFn: async ({ subKind, files, baseSort }) => {
      firstErrorRef.current = null;
      if (files.length === 0) return { firstError: null };

      const results = await presignedUpload({
        category: 'mobile-invitation',
        weddingId,
        invitationId,
        subKind,
        files,
        concurrency: 4,
        onUploaded: async (idx, r) => {
          try {
            await createPhotoAsync({
              subKind,
              storagePath: r.storagePath,
              fileName: r.fileName,
              fileSize: r.fileSize,
              mimeType: r.mimeType,
              sortOrder: subKind === 'gallery' ? baseSort + idx : 0,
            });
          } catch (e) {
            if (!firstErrorRef.current) firstErrorRef.current = (e as Error).message;
          }
        },
      });
      const putErr = results.find((r): r is Error => r instanceof Error);
      if (putErr && !firstErrorRef.current) firstErrorRef.current = putErr.message;

      return { firstError: firstErrorRef.current };
    },
    // invalidate는 useCreateMobileInvitationPhoto의 onSettled가 자동 책임.
  });
}
