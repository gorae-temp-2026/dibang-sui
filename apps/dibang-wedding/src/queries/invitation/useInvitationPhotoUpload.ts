import { useMutation } from '@tanstack/react-query';
import { compressImageForUpload } from '../../lib/compress-image';
import { presignedUpload } from '../../lib/presignedUpload';

// 청첩장 에디터 사진 업로드 mutation — presigned 직접 업로드 (STORAGE.md).
//  - Edit(wedding 존재): mobile-invitation 카테고리 → v3-mobile-invitation/{weddingId}/{subKind}/
//  - Create(wedding 미존재): invitation-draft → v3-tmp/{userId}/ (저장 확정 시 서버가 이동,
//    설계: _architecture/2026-06-10-invitation-draft-upload.md)
// 구 POST /uploads(user 폴더)는 폐기됨(2026-06-10) — 이 훅이 그 대체다.

export type InvitationUploadContext =
  | { mode: 'draft' }
  | { mode: 'wedding'; weddingId: string; invitationId: string };

export type InvitationPhotoSubKind = 'cover' | 'gallery' | 'canvas';

export function useInvitationPhotoUpload(
  ctx: InvitationUploadContext,
  subKind: InvitationPhotoSubKind,
) {
  return useMutation({
    retry: false,
    mutationFn: async (file: File): Promise<string> => {
      const compressed = await compressImageForUpload(file);
      const results = await presignedUpload({
        category: ctx.mode === 'wedding' ? 'mobile-invitation' : 'invitation-draft',
        weddingId: ctx.mode === 'wedding' ? ctx.weddingId : undefined,
        invitationId: ctx.mode === 'wedding' ? ctx.invitationId : undefined,
        subKind: ctx.mode === 'wedding' ? subKind : undefined,
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
