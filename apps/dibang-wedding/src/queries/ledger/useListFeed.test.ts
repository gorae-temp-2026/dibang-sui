/**
 * useListFeed — listFeed useInfiniteQuery 래퍼.
 *
 * 책임:
 *  - loungeId undefined OR enabled=false → disabled.
 *  - 그 외: listFeed({ path, query: { limit:20, cursor: pageParam } }) 호출.
 *  - getNextPageParam: has_more=true → next_cursor, 아니면 undefined.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listFeed = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  listFeed: (...args: unknown[]) => listFeed(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => [
    'feed',
    'infinite',
    path.loungeId,
  ],
}))

import { useListFeed } from './useListFeed'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  listFeed.mockReset()
})

describe('useListFeed', () => {
  it('loungeId undefined → disabled', () => {
    const { result } = renderHook(() => useListFeed(undefined), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(listFeed).not.toHaveBeenCalled()
  })

  it('enabled=false (loungeId 있어도) → disabled', () => {
    const { result } = renderHook(() => useListFeed('l-1', false), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(listFeed).not.toHaveBeenCalled()
  })

  it('정상: listFeed 호출 (limit 20, cursor undefined first)', async () => {
    listFeed.mockResolvedValue({ data: { items: [], has_more: false, next_cursor: null } })
    const { result } = renderHook(() => useListFeed('l-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listFeed).toHaveBeenCalledWith({
      path: { loungeId: 'l-1' },
      query: { limit: 20, cursor: undefined },
      throwOnError: true,
    })
  })

  it('has_more true → hasNextPage true', async () => {
    listFeed.mockResolvedValue({
      data: { items: [], has_more: true, next_cursor: 'cur-2' },
    })
    const { result } = renderHook(() => useListFeed('l-2'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('has_more false → hasNextPage false', async () => {
    listFeed.mockResolvedValue({
      data: { items: [], has_more: false, next_cursor: null },
    })
    const { result } = renderHook(() => useListFeed('l-3'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})
