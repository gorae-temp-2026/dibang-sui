/**
 * useUploadMemoryPhoto — 온기 게시물 사진 presigned 업로드 mutation.
 *
 * 책임 (STORAGE.md):
 *  - 압축(10MB 보장) 후 presignedUpload(category=memory, loungeId)로 업로드.
 *  - 경로: v3-memory/{loungeId}/ (lounge 스코프) — public URL 반환
 *    (라운지 피드 URL 직참조 + 레거시 절대 URL 행 호환. 비공개 전환은 별도 제품 결정).
 *  - 실패는 throw — 호출처(useComposeMemory)가 에러 표시.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const compressImageForUpload = vi.fn()
vi.mock('../../lib/compress-image', () => ({
  compressImageForUpload: (...args: unknown[]) => compressImageForUpload(...args),
}))

const presignedUpload = vi.fn()
vi.mock('../../lib/presignedUpload', () => ({
  presignedUpload: (...args: unknown[]) => presignedUpload(...args),
}))

import { useUploadMemoryPhoto } from './useUploadMemoryPhoto'
import { createQueryWrapper } from '../../test-utils'

const file = new File(['x'], 'm.jpg', { type: 'image/jpeg' })
const compressed = new File(['y'], 'm.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  compressImageForUpload.mockReset().mockResolvedValue(compressed)
  presignedUpload.mockReset()
})

describe('useUploadMemoryPhoto', () => {
  it('압축 후 memory 카테고리 + loungeId로 업로드, publicUrl 반환', async () => {
    presignedUpload.mockResolvedValue([
      { storagePath: 'v3-memory/L1/u.jpg', publicUrl: 'https://pub/m.jpg' },
    ])
    const { result } = renderHook(() => useUploadMemoryPhoto('L1'), {
      wrapper: createQueryWrapper(),
    })

    const url = await result.current.mutateAsync(file)

    expect(compressImageForUpload).toHaveBeenCalledWith(file)
    expect(presignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'memory', loungeId: 'L1', files: [compressed] }),
    )
    expect(url).toBe('https://pub/m.jpg')
  })

  it('결과가 Error면 reject, 압축 실패 시 업로드 미시도', async () => {
    presignedUpload.mockResolvedValue([new Error('PUT 실패')])
    const { result } = renderHook(() => useUploadMemoryPhoto('L1'), {
      wrapper: createQueryWrapper(),
    })
    await expect(result.current.mutateAsync(file)).rejects.toThrow('PUT 실패')

    compressImageForUpload.mockRejectedValue(new Error('10MB'))
    await expect(result.current.mutateAsync(file)).rejects.toThrow('10MB')
    expect(presignedUpload).toHaveBeenCalledTimes(1)
  })
})
