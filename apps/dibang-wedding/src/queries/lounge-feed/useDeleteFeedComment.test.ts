/**
 * useDeleteFeedComment — deleteFeedComment mutation + comments/feed invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const deleteFeedComment = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  deleteFeedComment: (...args: unknown[]) => deleteFeedComment(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedCommentsQueryKey: ({ query }: { query: { target_type: string; target_id: string } }) =>
    ['feed-comments', query.target_type, query.target_id],
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useDeleteFeedComment } from './useDeleteFeedComment'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => deleteFeedComment.mockReset())

describe('useDeleteFeedComment', () => {
  it('mutate → deleteFeedComment(path.commentId) 호출', async () => {
    deleteFeedComment.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useDeleteFeedComment(), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      commentId: 'c-1',
      targetType: 'guestbook_entry',
      targetId: 't-1',
      loungeId: 'l-1',
    })
    expect(deleteFeedComment).toHaveBeenCalledWith({
      path: { commentId: 'c-1' },
      throwOnError: true,
    })
  })

  it('성공 후 listFeedComments + listFeedInfinite 2 invalidate', async () => {
    deleteFeedComment.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteFeedComment(), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({
      commentId: 'c-2',
      targetType: 'host_announcement',
      targetId: 'a-1',
      loungeId: 'l-2',
    })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['feed-comments', 'host_announcement', 'a-1'],
      })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-2'] })
    })
  })
})
