// HEIC → JPEG 클라이언트 변환 (브라우저).
// UI/데이터 분리 P3-1: lib/presignedUpload.ts에서 분리.
//
// iOS 사진은 HEIC/HEIF 포맷이 흔하고, 브라우저 기본 디코더 지원이 들쭉날쭉해
// 업로드 전에 JPEG로 일괄 변환한다. heic2any는 wasm 기반이라 첫 호출에 비용이 있다.

import heic2any from 'heic2any';

/** HEIC 감지: file.type 또는 확장자. */
export function isHeic(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/heic' || t === 'image/heif') return true;
  const n = file.name.toLowerCase();
  return n.endsWith('.heic') || n.endsWith('.heif');
}

/** HEIC → JPEG (브라우저). 다른 포맷은 그대로 반환. */
export async function ensureJpegIfHeic(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const out = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([out], newName, { type: 'image/jpeg' });
}
