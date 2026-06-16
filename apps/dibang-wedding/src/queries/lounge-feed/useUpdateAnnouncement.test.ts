/**
 * useUpdateAnnouncement — generated mutation + announcements/loungeFeed invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  updateAnnouncementMutation: () => ({ mutationFn, mutationKey: ['updateAnnouncement'] }),
  listAnnouncementsQueryKey: ({ path }: { path: { loungeId: string } }) => ['announcements', path.loungeId],
}))

import { useUpdateAnnouncement } from './useUpdateAnnouncement'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => mutationFn.mockReset())

describe('useUpdateAnnouncement', () => {
  it('mutate → mutationFn + announcements + loungeFeed invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'a-1' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateAnnouncement('l-1'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: {}, body: {} } as never)
    expect(mutationFn).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['announcements', 'l-1'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['loungeFeed', 'l-1'] })
    })
  })
})
