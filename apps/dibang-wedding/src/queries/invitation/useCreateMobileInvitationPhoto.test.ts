/**
 * useCreateMobileInvitationPhoto — 단일 photo 등록 mutation + onSettled invalidate.
 *
 * 책임:
 *  - createMobileInvitationPhoto body 변환 (camelCase → snake_case).
 *  - onSettled에서 listMobileInvitationPhotos query 무효화 (성공/실패 모두).
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createMobileInvitationPhoto = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createMobileInvitationPhoto: (...args: unknown[]) => createMobileInvitationPhoto(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listMobileInvitationPhotosQueryKey: ({ path }: { path: { weddingId: string; invitationId: string } }) => [
    'mobile-photos',
    path.weddingId,
    path.invitationId,
  ],
}))

import { useCreateMobileInvitationPhoto } from './useCreateMobileInvitationPhoto'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createMobileInvitationPhoto.mockReset()
})

describe('useCreateMobileInvitationPhoto', () => {
  it('snake_case body로 변환 호출', async () => {
    createMobileInvitationPhoto.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useCreateMobileInvitationPhoto('w-1', 'i-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      subKind: 'gallery',
      storagePath: '/p/1',
      fileName: 'a.png',
      fileSize: 100,
      mimeType: 'image/png',
      sortOrder: 3,
    })
    expect(createMobileInvitationPhoto).toHaveBeenCalledWith({
      path: { weddingId: 'w-1', invitationId: 'i-1' },
      body: {
        sub_kind: 'gallery',
        storage_path: '/p/1',
        file_name: 'a.png',
        file_size: 100,
        mime_type: 'image/png',
        sort_order: 3,
      },
    })
  })

  it('성공 후 listMobileInvitationPhotos invalidate (onSettled)', async () => {
    createMobileInvitationPhoto.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMobileInvitationPhoto('w-2', 'i-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({
      subKind: 'cover',
      storagePath: '/c',
      fileName: 'c',
      fileSize: 1,
      mimeType: 'image/png',
      sortOrder: 0,
    })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mobile-photos', 'w-2', 'i-2'] }),
    )
  })

  it('실패 시에도 onSettled로 invalidate 수행', async () => {
    createMobileInvitationPhoto.mockRejectedValue(new Error('fail'))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMobileInvitationPhoto('w-3', 'i-3'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current
      .mutateAsync({
        subKind: 'cover',
        storagePath: '/c',
        fileName: 'c',
        fileSize: 1,
        mimeType: 'image/png',
        sortOrder: 0,
      })
      .catch(() => {})
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mobile-photos', 'w-3', 'i-3'] }),
    )
  })
})
