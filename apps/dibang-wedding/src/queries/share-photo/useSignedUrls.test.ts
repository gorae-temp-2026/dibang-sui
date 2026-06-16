/**
 * useSignedUrls — storage_path[] → signed URL[] query.
 *
 * 책임:
 *  - storagePaths null/undefined → disabled.
 *  - 빈 배열 → [] 즉시 반환 (lib 미호출).
 *  - paths 있음 → listSharedPhotoSignedUrls 호출 + 결과 반환.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listSharedPhotoSignedUrls = vi.fn()

vi.mock('../../lib/sharedPhotoUrl', () => ({
  listSharedPhotoSignedUrls: (...args: unknown[]) => listSharedPhotoSignedUrls(...args),
}))

import { useSignedUrls } from './useSignedUrls'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => listSharedPhotoSignedUrls.mockReset())

describe('useSignedUrls', () => {
  it('null → disabled', () => {
    const { result } = renderHook(() => useSignedUrls(null), { wrapper: createQueryWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('빈 배열 → [] 반환, lib 미호출', async () => {
    const { result } = renderHook(() => useSignedUrls([]), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    expect(listSharedPhotoSignedUrls).not.toHaveBeenCalled()
  })

  it('paths 있음 → listSharedPhotoSignedUrls 호출 + 결과 반환', async () => {
    listSharedPhotoSignedUrls.mockResolvedValue(['https://a/1', 'https://a/2'])
    const { result } = renderHook(() => useSignedUrls(['p1', 'p2']), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listSharedPhotoSignedUrls).toHaveBeenCalledWith(['p1', 'p2'])
    expect(result.current.data).toEqual(['https://a/1', 'https://a/2'])
  })
})
