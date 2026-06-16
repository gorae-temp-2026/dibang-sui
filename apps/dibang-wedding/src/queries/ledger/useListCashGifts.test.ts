/**
 * useListCashGifts — useInfiniteQuery 래퍼.
 *
 * 책임:
 *  - enabled: !!weddingId.
 *  - queryKey: listCashGiftsInfiniteQueryKey({ path: { weddingId } }).
 *  - queryFn: listCashGifts({ path: { weddingId }, query: { limit: 20, cursor: pageParam } }).
 *  - getNextPageParam: lastPage.has_more ? next_cursor : undefined.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listCashGifts = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  listCashGifts: (...args: unknown[]) => listCashGifts(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listCashGiftsInfiniteQueryKey: ({ path }: { path: { weddingId: string } }) => [
    'cashGifts',
    'infinite',
    path.weddingId,
  ],
}))

import { useListCashGifts } from './useListCashGifts'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  listCashGifts.mockReset()
})

describe('useListCashGifts', () => {
  it('weddingId undefined → disabled (queryFn 미호출)', () => {
    const { result } = renderHook(() => useListCashGifts(undefined), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(listCashGifts).not.toHaveBeenCalled()
  })

  it('weddingId 있음 → listCashGifts({ path, query: { limit: 20, cursor: undefined } }) 호출', async () => {
    listCashGifts.mockResolvedValue({
      data: { items: [], has_more: false, next_cursor: null },
    })
    const { result } = renderHook(() => useListCashGifts('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listCashGifts).toHaveBeenCalledWith({
      path: { weddingId: 'w-1' },
      query: { limit: 20, cursor: undefined },
      throwOnError: true,
    })
  })

  it('has_more=true + next_cursor 있음 → getNextPageParam이 next_cursor 반환', async () => {
    listCashGifts.mockResolvedValue({
      data: { items: [], has_more: true, next_cursor: 'page2' },
    })
    const { result } = renderHook(() => useListCashGifts('w-2'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('has_more=false → hasNextPage false', async () => {
    listCashGifts.mockResolvedValue({
      data: { items: [], has_more: false, next_cursor: null },
    })
    const { result } = renderHook(() => useListCashGifts('w-3'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})
