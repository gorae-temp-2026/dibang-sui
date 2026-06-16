/**
 * useCreateAnnouncement — generated createAnnouncementMutation spread +
 * 2 invalidate (listAnnouncements + listFeedInfinite).
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createAnnouncementMutation: () => ({ mutationFn, mutationKey: ['createAnnouncement'] }),
  listAnnouncementsQueryKey: ({ path }: { path: { loungeId: string } }) => ['announcements', path.loungeId],
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useCreateAnnouncement } from './useCreateAnnouncement'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => mutationFn.mockReset())

describe('useCreateAnnouncement', () => {
  it('mutate → mutationFn 호출 + 2 invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'a-1' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAnnouncement('l-1'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ body: {} } as never)
    expect(mutationFn).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['announcements', 'l-1'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-1'] })
    })
  })
})
