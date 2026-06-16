/**
 * useInvitationPhotoUpload — presigned(wedding/draft 스코프) 업로드 mutation.
 *
 * 책임 (STORAGE.md):
 *  - 압축(10MB 보장) 후 presignedUpload로 업로드, public URL 반환.
 *  - Edit(wedding 존재): category=mobile-invitation + weddingId/invitationId/subKind.
 *  - Create(wedding 미존재): category=invitation-draft — 저장 시 서버가 wedding 경로로 이동.
 *  - 실패(Error 결과·publicUrl 부재)는 throw — 호출처(낙관적 머신)가 failed로 표면화.
 *
 * compress-image · presignedUpload 모듈 경계를 vi.mock.
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

import { useInvitationPhotoUpload } from './useInvitationPhotoUpload'
import { createQueryWrapper } from '../../test-utils'

const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' })
const compressed = new File(['y'], 'p.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  compressImageForUpload.mockReset().mockResolvedValue(compressed)
  presignedUpload.mockReset()
})

describe('useInvitationPhotoUpload', () => {
  it('wedding 모드: mobile-invitation + weddingId/invitationId/subKind로 업로드, publicUrl 반환', async () => {
    presignedUpload.mockResolvedValue([
      { storagePath: 'v3-mobile-invitation/w1/gallery/u.jpg', publicUrl: 'https://pub/u.jpg' },
    ])
    const { result } = renderHook(
      () =>
        useInvitationPhotoUpload(
          { mode: 'wedding', weddingId: 'w1', invitationId: 'inv1' },
          'gallery',
        ),
      { wrapper: createQueryWrapper() },
    )

    const url = await result.current.mutateAsync(file)

    expect(compressImageForUpload).toHaveBeenCalledWith(file)
    expect(presignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'mobile-invitation',
        weddingId: 'w1',
        invitationId: 'inv1',
        subKind: 'gallery',
        files: [compressed],
      }),
    )
    expect(url).toBe('https://pub/u.jpg')
  })

  it('draft 모드: invitation-draft 카테고리, wedding 식별자 없이 업로드', async () => {
    presignedUpload.mockResolvedValue([
      { storagePath: 'v3-tmp/u1/a.jpg', publicUrl: 'https://pub/tmp-a.jpg' },
    ])
    const { result } = renderHook(() => useInvitationPhotoUpload({ mode: 'draft' }, 'cover'), {
      wrapper: createQueryWrapper(),
    })

    const url = await result.current.mutateAsync(file)

    expect(presignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'invitation-draft', files: [compressed] }),
    )
    const opts = presignedUpload.mock.calls[0][0] as Record<string, unknown>
    expect(opts.weddingId).toBeUndefined()
    expect(opts.subKind).toBeUndefined()
    expect(url).toBe('https://pub/tmp-a.jpg')
  })

  it('결과가 Error면 reject', async () => {
    presignedUpload.mockResolvedValue([new Error('PUT 실패')])
    const { result } = renderHook(() => useInvitationPhotoUpload({ mode: 'draft' }, 'cover'), {
      wrapper: createQueryWrapper(),
    })
    await expect(result.current.mutateAsync(file)).rejects.toThrow('PUT 실패')
  })

  it('압축 실패 시 업로드 시도 없이 reject', async () => {
    compressImageForUpload.mockRejectedValue(new Error('이미지를 10MB 이하로 줄이지 못했습니다.'))
    const { result } = renderHook(() => useInvitationPhotoUpload({ mode: 'draft' }, 'cover'), {
      wrapper: createQueryWrapper(),
    })
    await expect(result.current.mutateAsync(file)).rejects.toThrow('10MB')
    expect(presignedUpload).not.toHaveBeenCalled()
  })

  it('publicUrl 누락이면 reject (공개 카테고리 계약 위반)', async () => {
    presignedUpload.mockResolvedValue([{ storagePath: 'v3-tmp/u1/a.jpg' }])
    const { result } = renderHook(() => useInvitationPhotoUpload({ mode: 'draft' }, 'cover'), {
      wrapper: createQueryWrapper(),
    })
    await expect(result.current.mutateAsync(file)).rejects.toThrow()
  })
})
