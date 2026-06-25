import { useState } from 'react';
import { presignedUpload } from '../../lib/presignedUpload';
import { useT } from '../../lib/i18n';
import type { InvitationUploadContext } from '../../queries/invitation/useInvitationPhotoUpload';

// 레터링 이미지(PNG/SVG) 업로드 — presigned 경유 (STORAGE.md).
//  - Edit(wedding 존재): mobile-invitation + subKind=lettering → v3-mobile-invitation/{weddingId}/lettering/
//  - Create(wedding 미존재): invitation-draft → v3-tmp/{userId}/ (저장 확정 시 서버 relocate가
//    design_config.lettering.image_url을 감지해 wedding 경로로 이동)
// (이전 구현은 weddingId 없이 mobile-invitation을 호출해 양쪽 흐름 모두 400 — 2026-06-10 V2 리뷰)
export function useLetteringUpload(context: InvitationUploadContext) {
  const t = useT();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setIsPending(true);
    setError(null);
    try {
      const mime = file.type;
      if (!['image/png', 'image/svg+xml'].includes(mime)) {
        setError(t('lettering.invalidType'));
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t('lettering.tooBig'));
        return null;
      }

      const results = await presignedUpload(
        context.mode === 'wedding'
          ? {
              category: 'mobile-invitation',
              weddingId: context.weddingId,
              invitationId: context.invitationId,
              subKind: 'lettering',
              files: [file],
            }
          : { category: 'invitation-draft', files: [file] },
      );

      const result = results[0];
      if (!result || result instanceof Error) {
        setError(result instanceof Error ? result.message : t('lettering.uploadFailed'));
        return null;
      }
      return result.publicUrl || result.storagePath;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('lettering.uploadFailed'));
      return null;
    } finally {
      setIsPending(false);
    }
  }

  return { upload, isPending, error };
}
