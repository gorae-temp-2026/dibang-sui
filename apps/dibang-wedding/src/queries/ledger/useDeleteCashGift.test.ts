/**
 * useDeleteCashGift — generated deleteCashGiftMutation spread + 2 query invalidate.
 *
 * 책임:
 *  - mutation 옵션 spread.
 *  - 성공 후 listCashGiftsInfinite + summary 2개 invalidate.
 *  - weddingId undefined일 때도 invalidate 호출 (현재 코드는 가드 없음 — useCreateCashGift와 다름).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  deleteCashGiftMutation: () => ({ mutationFn, mutationKey: ['deleteCashGift'] }),
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

import { useDeleteCashGift } from './useDeleteCashGift'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  mutationFn.mockReset()
})

describe('useDeleteCashGift', () => {
  it('mutate → 내부 mutationFn 호출', async () => {
    mutationFn.mockResolvedValue(null)
    const { result } = renderHook(() => useDeleteCashGift('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ path: { weddingId: 'w-1', giftId: 'g-1' } })
    expect(mutationFn).toHaveBeenCalledTimes(1)
  })

  it('성공 → list + summary 2개 invalidate (정확한 queryKey)', async () => {
    mutationFn.mockResolvedValue(null)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteCashGift('w-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: { weddingId: 'w-2', giftId: 'g-2' } })
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
