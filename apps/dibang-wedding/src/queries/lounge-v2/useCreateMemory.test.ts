/**
 * useCreateMemory — asAnnounce 분기 (createAnnouncement vs createMemory) + 3 invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createAnnouncement = vi.fn()
const createMemory = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createAnnouncement: (...args: unknown[]) => createAnnouncement(...args),
  createMemory: (...args: unknown[]) => createMemory(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
  listAnnouncementsQueryKey: ({ path }: { path: { loungeId: string } }) => ['announcements', path.loungeId],
  listMemoriesQueryKey: ({ path }: { path: { loungeId: string } }) => ['memories', path.loungeId],
}))

import { useCreateMemory } from './useCreateMemory'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createAnnouncement.mockReset()
  createMemory.mockReset()
})

describe('useCreateMemory', () => {
  it('asAnnounce=true → createAnnouncement(is_pinned false), createMemory 미호출', async () => {
    createAnnouncement.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useCreateMemory('l-1'), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync({ text: '공지', asAnnounce: true })
    expect(createAnnouncement).toHaveBeenCalledWith({
      path: { loungeId: 'l-1' },
      body: { message: '공지', is_pinned: false },
      throwOnError: true,
    })
    expect(createMemory).not.toHaveBeenCalled()
  })

  it('asAnnounce=false → createMemory(lounge_id/text/photo_url)', async () => {
    createMemory.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useCreateMemory('l-2'), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync({ text: '온기', asAnnounce: false, photoUrl: 'https://a/p.jpg' })
    expect(createMemory).toHaveBeenCalledWith({
      body: { lounge_id: 'l-2', text: '온기', photo_url: 'https://a/p.jpg' },
      throwOnError: true,
    })
    expect(createAnnouncement).not.toHaveBeenCalled()
  })

  it('성공 후 memories + feed + announcements 3 invalidate', async () => {
    createMemory.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMemory('l-3'), { wrapper: createQueryWrapper(client) })
    await result.current.mutateAsync({ text: 't', asAnnounce: false })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['memories', 'l-3'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-3'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['announcements', 'l-3'] })
    })
  })
})
