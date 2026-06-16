// 업로드 전 클라이언트 이미지 압축 (browser-image-compression).
//
// 서버 /uploads는 10MB 초과 본문을 받다가 끊어버려(HTTP/2 stream reset)
// 브라우저에 CORS/프로토콜 에러로 나타난다. 이 모듈이 업로드 전에 10MB
// 이하를 보장해 그 경로 자체를 차단한다. 압축 실패 시 원본 fallback 금지 —
// 초과 원본이 서버로 가면 위 증상이 재현되므로 에러로 멈춘다.
//
// 포맷 정책:
//  - HEIC/HEIF: 라이브러리가 디코드 못 함 → ensureJpegIfHeic 선변환 (heic-convert.ts 재사용)
//  - GIF: 재인코딩하면 애니메이션 소실 → 압축 스킵, 한도 초과만 차단
//  - JPEG/PNG/WebP: 압축. fileType 미지정 시 원본 포맷 유지(PNG 투명 보존)
//  - 그 외(svg 등): 서버 확장자 검증에 맡기고 한도만 차단

import imageCompression from 'browser-image-compression';
import { ensureJpegIfHeic } from './heic-convert';

/** 구 POST /uploads의 10MB 본문 제한을 계승한 클라이언트 상한 (해당 핸들러는 폐기 — STORAGE.md). */
export const SERVER_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

/** multipart 오버헤드 마진을 둔 압축 목표 (MB). */
const TARGET_SIZE_MB = 9;

/** 청첩장 표시 용도 상한 — 긴 변 기준 px. */
const MAX_DIMENSION = 2560;

const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// 일부 OS·드래그드롭 경로는 file.type이 빈 문자열 — isGif처럼 확장자 폴백
const COMPRESSIBLE_EXT = /\.(jpe?g|png|webp)$/i;

function isGif(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

function isCompressible(file: File): boolean {
  return COMPRESSIBLE_TYPES.includes(file.type) || COMPRESSIBLE_EXT.test(file.name);
}

function assertWithinLimit(file: File, label: string): void {
  if (file.size > SERVER_UPLOAD_LIMIT_BYTES) {
    throw new Error(`${label}은 10MB 이하만 업로드할 수 있습니다.`);
  }
}

/**
 * 업로드 직전 파일을 10MB 이하로 보장해 반환.
 * 실패(디코드 불가·압축 후에도 초과)는 throw — 호출자(mutation)가 에러로 표면화.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (isGif(file)) {
    assertWithinLimit(file, 'GIF');
    return file;
  }

  const source = await ensureJpegIfHeic(file);

  if (!isCompressible(source)) {
    assertWithinLimit(source, '이 형식의 파일');
    return source;
  }

  const compressed = await imageCompression(source, {
    maxSizeMB: TARGET_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
  });

  if (compressed.size > SERVER_UPLOAD_LIMIT_BYTES) {
    throw new Error('이미지를 10MB 이하로 줄이지 못했습니다. 다른 사진을 선택해 주세요.');
  }
  // browser-image-compression은 타입 정의(Promise<File>)와 달리 실제로는
  // name만 붙은 Blob을 반환한다. multipart 직렬화는 File일 때만 filename을
  // 보존하므로(아니면 "blob" → 서버 확장자 검사 400) 진짜 File로 재포장한다.
  return new File([compressed], source.name, { type: compressed.type || source.type });
}
