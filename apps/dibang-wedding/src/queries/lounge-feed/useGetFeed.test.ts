/**
 * useGetFeed — useInfiniteQuery (5s polling) + has_more 페이지네이션.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listFeed = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  listFeed: (...args: unknown[]) => listFeed(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

import { useGetFeed } from './useGetFeed'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => listFeed.mockReset())

describe('useGetFeed', () => {
  it('loungeId 빈문자 → disabled', () => {
    const { result } = renderHook(() => useGetFeed(''), { wrapper: createQueryWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('정상: listFeed 호출 with limit 20, cursor undefined', async () => {
    listFeed.mockResolvedValue({ data: { items: [], has_more: false, next_cursor: null } })
    const { result } = renderHook(() => useGetFeed('l-1'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listFeed).toHaveBeenCalledWith({
      path: { loungeId: 'l-1' },
      query: { limit: 20, cursor: undefined },
      throwOnError: true,
    })
  })

  it('has_more=true → hasNextPage true', async () => {
    listFeed.mockResolvedValue({
      data: { items: [], has_more: true, next_cursor: 'cur2' },
    })
    const { result } = renderHook(() => useGetFeed('l-2'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('has_more=false → hasNextPage false', async () => {
    listFeed.mockResolvedValue({
      data: { items: [], has_more: false, next_cursor: null },
    })
    const { result } = renderHook(() => useGetFeed('l-3'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})
