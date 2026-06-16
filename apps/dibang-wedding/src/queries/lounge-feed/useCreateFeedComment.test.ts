/**
 * useCreateFeedComment — createFeedComment mutation + comments/feed invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createFeedComment = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createFeedComment: (...args: unknown[]) => createFeedComment(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedCommentsQueryKey: ({ query }: { query: { target_type: string; target_id: string } }) =>
    ['feed-comments', query.target_type, query.target_id],
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useCreateFeedComment } from './useCreateFeedComment'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => createFeedComment.mockReset())

describe('useCreateFeedComment', () => {
  it('body 변환(target_type/id/message) + data 반환', async () => {
    createFeedComment.mockResolvedValue({ data: { id: 'c-1' } })
    const { result } = renderHook(() => useCreateFeedComment(), {
      wrapper: createQueryWrapper(),
    })
    const data = await result.current.mutateAsync({
      targetType: 'guestbook_entry',
      targetId: 't-1',
      message: 'hi',
      loungeId: 'l-1',
    })
    expect(createFeedComment).toHaveBeenCalledWith({
      body: { target_type: 'guestbook_entry', target_id: 't-1', message: 'hi' },
      throwOnError: true,
    })
    expect(data).toEqual({ id: 'c-1' })
  })

  it('성공 후 listFeedComments + listFeedInfinite 2 invalidate', async () => {
    createFeedComment.mockResolvedValue({ data: {} })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateFeedComment(), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({
      targetType: 'host_announcement',
      targetId: 'a-1',
      message: 'm',
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
