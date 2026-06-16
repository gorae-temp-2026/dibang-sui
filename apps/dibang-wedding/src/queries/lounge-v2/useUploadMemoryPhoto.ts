import { useMutation } from '@tanstack/react-query';
import { compressImageForUpload } from '../../lib/compress-image';
import { presignedUpload } from '../../lib/presignedUpload';

// 온기 게시물 사진 업로드 — presigned memory 카테고리 (STORAGE.md).
// 경로: v3-memory/{loungeId}/ (lounge 스코프). public URL 반환 — 라운지 피드가
// URL 직참조로 렌더하고 기존 photo_url 데이터가 절대 URL이라 호환 유지.
// private(signed URL) 전환은 별도 제품 결정으로 보류 (2026-06-10).
export function useUploadMemoryPhoto(loungeId: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const compressed = await compressImageForUpload(file);
      const results = await presignedUpload({
        category: 'memory',
        loungeId,
        files: [compressed],
      });
      const r = results[0];
      if (!r) throw new Error('업로드에 실패했습니다.');
      if (r instanceof Error) throw r;
      if (!r.publicUrl) throw new Error('업로드 응답에 공개 URL이 없습니다.');
      return r.publicUrl;
    },
  });
}
