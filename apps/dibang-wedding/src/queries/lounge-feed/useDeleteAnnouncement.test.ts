/**
 * useDeleteAnnouncement — deleteAnnouncement mutation + 2 invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const deleteAnnouncement = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  deleteAnnouncement: (...args: unknown[]) => deleteAnnouncement(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listAnnouncementsQueryKey: ({ path }: { path: { loungeId: string } }) => ['announcements', path.loungeId],
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useDeleteAnnouncement } from './useDeleteAnnouncement'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => deleteAnnouncement.mockReset())

describe('useDeleteAnnouncement', () => {
  it('mutate → deleteAnnouncement(path.announcementId) 호출', async () => {
    deleteAnnouncement.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useDeleteAnnouncement('l-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ announcementId: 'a-1', loungeId: 'l-1' })
    expect(deleteAnnouncement).toHaveBeenCalledWith({
      path: { announcementId: 'a-1' },
      throwOnError: true,
    })
  })

  it('성공 후 announcements + feed-infinite 2 invalidate', async () => {
    deleteAnnouncement.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteAnnouncement('l-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ announcementId: 'a-2', loungeId: 'l-2' })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['announcements', 'l-2'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-2'] })
    })
  })
})
