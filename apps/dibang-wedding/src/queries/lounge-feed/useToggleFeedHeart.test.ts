/**
 * useToggleFeedHeart — toggleFeedHeart mutation + feed invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const toggleFeedHeart = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  toggleFeedHeart: (...args: unknown[]) => toggleFeedHeart(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useToggleFeedHeart } from './useToggleFeedHeart'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => toggleFeedHeart.mockReset())

describe('useToggleFeedHeart', () => {
  it('body 변환(target_type/id) + data 반환', async () => {
    toggleFeedHeart.mockResolvedValue({ data: { hearted: true } })
    const { result } = renderHook(() => useToggleFeedHeart(), { wrapper: createQueryWrapper() })
    const data = await result.current.mutateAsync({
      targetType: 'guestbook_entry',
      targetId: 't-1',
      loungeId: 'l-1',
    })
    expect(toggleFeedHeart).toHaveBeenCalledWith({
      body: { target_type: 'guestbook_entry', target_id: 't-1' },
      throwOnError: true,
    })
    expect(data).toEqual({ hearted: true })
  })

  it('성공 후 feed infinite invalidate by loungeId', async () => {
    toggleFeedHeart.mockResolvedValue({ data: {} })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useToggleFeedHeart(), { wrapper: createQueryWrapper(client) })
    await result.current.mutateAsync({ targetType: 'host_announcement', targetId: 'a-1', loungeId: 'l-2' })
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-2'] }))
  })
})
