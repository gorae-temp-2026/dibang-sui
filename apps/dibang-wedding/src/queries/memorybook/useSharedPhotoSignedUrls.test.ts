/**
 * useSharedPhotoSignedUrls — paths[] → signed URL Map(path → url).
 *
 * 책임:
 *  - 빈 paths → 빈 Map.
 *  - paths 있음 → listSharedPhotoSignedUrls 결과를 path별 Map으로.
 *  - 실패(undefined) 항목은 Map에서 제외.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listSharedPhotoSignedUrls = vi.fn()

vi.mock('../../lib/sharedPhotoUrl', () => ({
  listSharedPhotoSignedUrls: (...args: unknown[]) => listSharedPhotoSignedUrls(...args),
}))

import { useSharedPhotoSignedUrls } from './useSharedPhotoSignedUrls'

afterEach(() => listSharedPhotoSignedUrls.mockReset())

describe('useSharedPhotoSignedUrls', () => {
  it('빈 paths → 빈 Map, lib 미호출', () => {
    const { result } = renderHook(() => useSharedPhotoSignedUrls([]))
    expect(result.current).toEqual({})
    expect(listSharedPhotoSignedUrls).not.toHaveBeenCalled()
  })

  it('paths 있음 → path별 url Map', async () => {
    listSharedPhotoSignedUrls.mockResolvedValue(['https://a/1', 'https://a/2'])
    const { result } = renderHook(() => useSharedPhotoSignedUrls(['p1', 'p2']))
    await waitFor(() =>
      expect(result.current).toEqual({ p1: 'https://a/1', p2: 'https://a/2' }),
    )
  })

  it('실패한 항목(undefined)은 Map에서 제외', async () => {
    listSharedPhotoSignedUrls.mockResolvedValue(['https://a/1', undefined])
    const { result } = renderHook(() => useSharedPhotoSignedUrls(['p1', 'p2']))
    await waitFor(() => expect(result.current).toEqual({ p1: 'https://a/1' }))
  })
})
