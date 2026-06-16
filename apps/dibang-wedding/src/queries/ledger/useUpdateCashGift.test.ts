/**
 * useUpdateCashGift — generated updateCashGiftMutation spread + 2 query invalidate.
 *
 * useDeleteCashGift와 구조 동일.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  updateCashGiftMutation: () => ({ mutationFn, mutationKey: ['updateCashGift'] }),
  listCashGiftsInfiniteQueryKey: ({ path }: { path: { weddingId: string } }) => [
    'cashGifts',
    'infinite',
    path.weddingId,
  ],
  getCashGiftsSummaryQueryKey: ({ path }: { path: { weddingId: string } }) => [
    'cashGifts',
    'summary',
    path.weddingId,
  ],
}))

import { useUpdateCashGift } from './useUpdateCashGift'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  mutationFn.mockReset()
})

describe('useUpdateCashGift', () => {
  it('mutate → 내부 mutationFn 호출', async () => {
    mutationFn.mockResolvedValue({ id: 'g-1' })
    const { result } = renderHook(() => useUpdateCashGift('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      path: { weddingId: 'w-1', giftId: 'g-1' },
      body: { amount: 100 },
    })
    expect(mutationFn).toHaveBeenCalledTimes(1)
  })

  it('성공 → list + summary 2개 invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'g-2' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateCashGift('w-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({
      path: { weddingId: 'w-2', giftId: 'g-2' },
      body: { amount: 200 },
    })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['cashGifts', 'infinite', 'w-2'],
      })
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['cashGifts', 'summary', 'w-2'],
      })
    })
  })
})
