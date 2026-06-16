// Photo Sharing presigned upload 오케스트레이션.
// 시나리오 §11: HEIC→JPEG 클라이언트 변환 + 병렬 동시성 3-5 + 자동 재시도 1회.
// SDK: createPresignedUpload (POST /uploads/presigned) → { upload_url, object_key, public_url? }
//      → 클라이언트가 PUT으로 직접 업로드.
//
// UI/데이터 분리 P3-1: 다음 책임을 분리해 본 모듈은 오케스트레이션만 보유:
//   - HEIC 감지·변환 → lib/heic-convert
//   - XHR PUT + 진행률 → lib/blob-put
// 외부 시그니처(presignedUpload, PresignedUploadResult, PresignedUploadOptions,
// PresignedUploadItemState)는 변경 없음.

import pLimit from 'p-limit';
import { createPresignedUpload } from '@gorae/contracts/sdk.gen';
import { ensureJpegIfHeic, isHeic } from './heic-convert';
import { putBinary } from './blob-put';

export type PresignedCategory = 'mobile-invitation' | 'memory' | 'share' | 'invitation-draft';
export type PresignedSubKind = 'cover' | 'gallery' | 'lettering' | 'canvas';

export interface PresignedUploadOptions {
  category: PresignedCategory;
  weddingId?: string;
  invitationId?: string;
  subKind?: PresignedSubKind;
  loungeId?: string;
  files: File[];
  concurrency?: number; // 기본 4 (§ S-03 3-5)
  autoRetry?: number;   // 기본 1
  onProgress?: (idx: number, state: PresignedUploadItemState) => void;
  // PUT 성공 직후 같은 pLimit 슬롯에서 await되는 후처리 훅.
  // 도메인 register(createSharedPhoto 등)를 여기서 호출하면 "전체 PUT 끝 → 직렬 register"
  // 대신 "파일별 PUT → register chain"이 되어 다른 파일의 PUT과 인터리브됨.
  // 콜백 throw는 흡수(autoRetry 트리거 안 함) — register는 idempotent 아닐 수 있어
  // 호출자가 콜백 내부에서 catch 책임.
  onUploaded?: (idx: number, result: PresignedUploadResult) => Promise<void> | void;
}

export type PresignedUploadItemState =
  | { phase: 'queued' }
  | { phase: 'converting' } // HEIC → JPEG
  | { phase: 'requesting' } // POST /uploads/presigned
  | { phase: 'uploading'; percent: number } // PUT
  | { phase: 'done'; objectKey: string; publicUrl?: string }
  | { phase: 'failed'; error: string };

export interface PresignedUploadResult {
  storagePath: string;     // = object_key
  publicUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** 단일 파일 업로드 — HEIC 변환 → presigned 요청 → PUT → onUploaded 후처리. */
async function uploadOne(
  opts: PresignedUploadOptions,
  idx: number,
  file: File,
  notify: (s: PresignedUploadItemState) => void,
): Promise<PresignedUploadResult> {
  let f = file;
  if (isHeic(f)) {
    notify({ phase: 'converting' });
    f = await ensureJpegIfHeic(f);
  }
  notify({ phase: 'requesting' });
  const res = await createPresignedUpload({
    body: {
      category: opts.category,
      wedding_id: opts.weddingId,
      invitation_id: opts.invitationId,
      sub_kind: opts.subKind,
      lounge_id: opts.loungeId,
      file_name: f.name,
      mime_type: f.type || 'application/octet-stream',
    },
  });
  if (!res.data) {
    throw new Error('presigned response missing data');
  }
  const { upload_url, object_key, public_url } = res.data;

  notify({ phase: 'uploading', percent: 0 });
  await putBinary({
    uploadUrl: upload_url,
    file: f,
    onPercent: (p) => notify({ phase: 'uploading', percent: p }),
  });

  const result: PresignedUploadResult = {
    storagePath: object_key,
    publicUrl: public_url ?? undefined,
    fileName: f.name,
    fileSize: f.size,
    mimeType: f.type || 'application/octet-stream',
  };
  if (opts.onUploaded) {
    try {
      await opts.onUploaded(idx, result);
    } catch {
      // intentional: 콜백(register) 실패는 PUT의 성공/실패와 분리. autoRetry로 흘러가면
      // 중복 row 위험. 호출자가 콜백 내부에서 .catch로 결과 처리·로깅 책임.
    }
  }
  notify({ phase: 'done', objectKey: object_key, publicUrl: public_url ?? undefined });
  return result;
}

/**
 * presignedUpload — 다수 파일 병렬 업로드. 실패는 autoRetry 만큼 재시도 후 fail.
 * 반환: 각 파일의 PresignedUploadResult | Error.
 */
export async function presignedUpload(
  opts: PresignedUploadOptions,
): Promise<Array<PresignedUploadResult | Error>> {
  const concurrency = opts.concurrency ?? 4;
  const autoRetry = opts.autoRetry ?? 1;
  const limit = pLimit(concurrency);

  const tasks = opts.files.map((file, idx) =>
    limit(async () => {
      const notify = (s: PresignedUploadItemState) => opts.onProgress?.(idx, s);
      notify({ phase: 'queued' });
      let lastErr: unknown;
      for (let attempt = 0; attempt <= autoRetry; attempt++) {
        try {
          return (await uploadOne(opts, idx, file, notify)) as PresignedUploadResult;
        } catch (err) {
          lastErr = err;
        }
      }
      const e = lastErr instanceof Error ? lastErr : new Error(String(lastErr));
      notify({ phase: 'failed', error: e.message });
      return e;
    }),
  );

  return Promise.all(tasks);
}
