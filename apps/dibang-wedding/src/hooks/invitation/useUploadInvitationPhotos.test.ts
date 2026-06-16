/**
 * useUploadInvitationPhotos — presigned PUT + createPhoto register chain.
 *
 * 책임:
 *  - files=[]: 즉시 { firstError: null }.
 *  - presignedUpload onUploaded 콜백 → createPhotoAsync(register) 호출 with subKind/storagePath/etc.
 *  - gallery sortOrder = baseSort + idx, cover = 0 고정.
 *  - register throw: firstError에 첫 메시지 보존, 이후 register 에러는 덮어쓰지 않음.
 *  - PUT 자체 실패(results[i] instanceof Error): register 에러 없으면 PUT 에러 메시지 사용.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

interface UploadOpts {
  onUploaded: (idx: number, r: { storagePath: string; fileName: string; fileSize: number; mimeType: string }) => Promise<void>
  files: File[]
}

const presignedUpload = vi.fn()
const createPhotoAsync = vi.fn()

vi.mock('../../lib/presignedUpload', () => ({
  presignedUpload: (opts: UploadOpts) => presignedUpload(opts),
}))
vi.mock('../../queries/invitation/useCreateMobileInvitationPhoto', () => ({
  useCreateMobileInvitationPhoto: (_w: string, _i: string) => ({
    mutateAsync: createPhotoAsync,
  }),
}))

import { useUploadInvitationPhotos } from './useUploadInvitationPhotos'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  presignedUpload.mockReset()
  createPhotoAsync.mockReset()
})

function makeFile(name: string) {
  return new File(['x'], name, { type: 'image/png' })
}

describe('useUploadInvitationPhotos', () => {
  it('files=[] → presignedUpload 미호출, firstError=null', async () => {
    const { result } = renderHook(() => useUploadInvitationPhotos('w', 'i'), {
      wrapper: createQueryWrapper(),
    })
    const r = await result.current.mutateAsync({ subKind: 'gallery', files: [], baseSort: 0 })
    expect(presignedUpload).not.toHaveBeenCalled()
    expect(r.firstError).toBeNull()
  })

  it('gallery: onUploaded마다 createPhoto(sortOrder = baseSort + idx) 호출', async () => {
    presignedUpload.mockImplementation(async (opts: UploadOpts) => {
      for (let i = 0; i < opts.files.length; i++) {
        await opts.onUploaded(i, {
          storagePath: `/p/${i}`,
          fileName: opts.files[i].name,
          fileSize: 1,
          mimeType: 'image/png',
        })
      }
      return [] // no PUT errors
    })
    createPhotoAsync.mockResolvedValue({ id: 'p' })
    const { result } = renderHook(() => useUploadInvitationPhotos('w', 'i'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      subKind: 'gallery',
      files: [makeFile('a.png'), makeFile('b.png')],
      baseSort: 5,
    })
    expect(createPhotoAsync).toHaveBeenCalledTimes(2)
    expect(createPhotoAsync.mock.calls[0][0].sortOrder).toBe(5)
    expect(createPhotoAsync.mock.calls[1][0].sortOrder).toBe(6)
  })

  it('cover: sortOrder=0 고정', async () => {
    presignedUpload.mockImplementation(async (opts: UploadOpts) => {
      await opts.onUploaded(0, { storagePath: '/c', fileName: 'c', fileSize: 1, mimeType: 'image/png' })
      return []
    })
    createPhotoAsync.mockResolvedValue({ id: 'p' })
    const { result } = renderHook(() => useUploadInvitationPhotos('w', 'i'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ subKind: 'cover', files: [makeFile('c.png')], baseSort: 99 })
    expect(createPhotoAsync.mock.calls[0][0].sortOrder).toBe(0)
  })

  it('register throw: firstError에 첫 메시지 보존 + 이후는 덮어쓰지 않음', async () => {
    presignedUpload.mockImplementation(async (opts: UploadOpts) => {
      for (let i = 0; i < opts.files.length; i++) {
        await opts.onUploaded(i, { storagePath: `/p/${i}`, fileName: '', fileSize: 1, mimeType: '' })
      }
      return []
    })
    createPhotoAsync
      .mockRejectedValueOnce(new Error('first reg fail'))
      .mockRejectedValueOnce(new Error('second reg fail'))
    const { result } = renderHook(() => useUploadInvitationPhotos('w', 'i'), {
      wrapper: createQueryWrapper(),
    })
    const r = await result.current.mutateAsync({
      subKind: 'gallery',
      files: [makeFile('a.png'), makeFile('b.png')],
      baseSort: 0,
    })
    expect(r.firstError).toBe('first reg fail')
  })

  it('PUT 자체 실패: register 에러 없을 때만 PUT 에러 메시지 사용', async () => {
    presignedUpload.mockImplementation(async (_opts: UploadOpts) => {
      // 아무 onUploaded 호출 없음(실패 가정), results에 Error 포함
      return [new Error('put failed')]
    })
    const { result } = renderHook(() => useUploadInvitationPhotos('w', 'i'), {
      wrapper: createQueryWrapper(),
    })
    const r = await result.current.mutateAsync({
      subKind: 'gallery',
      files: [makeFile('a.png')],
      baseSort: 0,
    })
    expect(r.firstError).toBe('put failed')
  })
})
