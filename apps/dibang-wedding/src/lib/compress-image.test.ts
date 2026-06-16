/**
 * compress-image — 업로드 전 클라이언트 이미지 압축 래퍼.
 *
 * 책임:
 *  - compressImageForUpload(file)이 서버 /uploads 10MB 제한을 클라이언트에서 보장.
 *  - HEIC/HEIF → ensureJpegIfHeic 선변환 후 압축.
 *  - GIF → 재인코딩 시 애니메이션 소실이라 압축 스킵, 10MB 초과만 차단.
 *  - 압축 실패·결과 10MB 초과 → 에러 전파 (원본 fallback 금지 — 초과 원본이
 *    서버로 흘러가면 HTTP/2 스트림 reset으로 지저분하게 실패).
 *
 * browser-image-compression · ./heic-convert 를 vi.mock으로 controlled fake 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const imageCompressionMock = vi.fn();
vi.mock('browser-image-compression', () => ({
  default: (...args: unknown[]) => imageCompressionMock(...args),
}));

const ensureJpegIfHeicMock = vi.fn();
vi.mock('./heic-convert', () => ({
  ensureJpegIfHeic: (...args: unknown[]) => ensureJpegIfHeicMock(...args),
  isHeic: (file: File) => file.type === 'image/heic',
}));

import { compressImageForUpload, SERVER_UPLOAD_LIMIT_BYTES } from './compress-image';

const MB = 1024 * 1024;

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

beforeEach(() => {
  imageCompressionMock.mockReset();
  ensureJpegIfHeicMock.mockReset();
  // 기본: HEIC 아님 → 원본 그대로 통과
  ensureJpegIfHeicMock.mockImplementation(async (f: File) => f);
});

describe('compressImageForUpload', () => {
  it('JPEG: 압축 라이브러리를 거쳐 원본 이름의 진짜 File로 반환한다', async () => {
    const input = makeFile('photo.jpg', 'image/jpeg', 12 * MB);
    const output = makeFile('photo.jpg', 'image/jpeg', 2 * MB);
    imageCompressionMock.mockResolvedValue(output);

    const result = await compressImageForUpload(input);

    expect(imageCompressionMock).toHaveBeenCalledTimes(1);
    expect(imageCompressionMock.mock.calls[0][0]).toBe(input);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('압축 라이브러리가 name만 붙은 Blob을 반환해도 진짜 File로 재포장한다', async () => {
    const input = makeFile('photo.jpg', 'image/jpeg', 12 * MB);
    // browser-image-compression 실동작: File이 아닌 Blob에 name 속성만 부착
    const blobOut = new Blob([new Uint8Array(2 * MB)], { type: 'image/jpeg' });
    Object.assign(blobOut, { name: 'photo.jpg' });
    imageCompressionMock.mockResolvedValue(blobOut);

    const result = await compressImageForUpload(input);

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('HEIC: JPEG 선변환 후 변환본을 압축하고 변환본 이름을 유지한다', async () => {
    const input = makeFile('photo.heic', 'image/heic', 12 * MB);
    const converted = makeFile('photo.jpg', 'image/jpeg', 11 * MB);
    const output = makeFile('photo.jpg', 'image/jpeg', 2 * MB);
    ensureJpegIfHeicMock.mockResolvedValue(converted);
    imageCompressionMock.mockResolvedValue(output);

    const result = await compressImageForUpload(input);

    expect(ensureJpegIfHeicMock).toHaveBeenCalledWith(input);
    expect(imageCompressionMock.mock.calls[0][0]).toBe(converted);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.jpg');
  });

  it('GIF(10MB 이하): 압축 없이 원본을 그대로 반환한다', async () => {
    const input = makeFile('ani.gif', 'image/gif', 1 * MB);

    const result = await compressImageForUpload(input);

    expect(result).toBe(input);
    expect(imageCompressionMock).not.toHaveBeenCalled();
  });

  it('GIF(10MB 초과): 압축 시도 없이 에러를 던진다', async () => {
    const input = makeFile('ani.gif', 'image/gif', 11 * MB);

    await expect(compressImageForUpload(input)).rejects.toThrow(/GIF/);
    expect(imageCompressionMock).not.toHaveBeenCalled();
  });

  it('압축 라이브러리가 실패하면 에러를 전파한다 (원본 fallback 금지)', async () => {
    const input = makeFile('photo.jpg', 'image/jpeg', 12 * MB);
    imageCompressionMock.mockRejectedValue(new Error('decode failed'));

    await expect(compressImageForUpload(input)).rejects.toThrow('decode failed');
  });

  it('압축 결과가 여전히 10MB 초과면 에러를 던진다', async () => {
    const input = makeFile('huge.png', 'image/png', 50 * MB);
    const stillBig = makeFile('huge.png', 'image/png', SERVER_UPLOAD_LIMIT_BYTES + 1);
    imageCompressionMock.mockResolvedValue(stillBig);

    await expect(compressImageForUpload(input)).rejects.toThrow(/10MB/);
  });

  it('type이 빈 JPEG(드래그드롭 등): 확장자 폴백으로 압축 경로를 탄다', async () => {
    const input = makeFile('photo.JPG', '', 12 * MB);
    const output = makeFile('photo.JPG', 'image/jpeg', 2 * MB);
    imageCompressionMock.mockResolvedValue(output);

    const result = await compressImageForUpload(input);

    expect(imageCompressionMock.mock.calls[0][0]).toBe(input);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.JPG');
    expect(result.type).toBe('image/jpeg');
  });

  it('압축 불가 포맷(svg 등): 10MB 이하면 통과, 초과면 에러', async () => {
    const small = makeFile('logo.svg', 'image/svg+xml', 1 * MB);
    await expect(compressImageForUpload(small)).resolves.toBe(small);
    expect(imageCompressionMock).not.toHaveBeenCalled();

    const big = makeFile('logo.svg', 'image/svg+xml', 11 * MB);
    await expect(compressImageForUpload(big)).rejects.toThrow(/10MB/);
  });
});
