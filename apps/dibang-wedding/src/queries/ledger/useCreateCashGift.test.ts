/**
 * useCreateCashGift — hostCreateCashGiftMutation spread + 2개 query invalidate.
 *
 * 책임:
 *  - 생성된 mutation 옵션 spread.
 *  - 성공 후 listCashGiftsInfinite + getCashGiftsSummary 두 query invalidate.
 *  - weddingId=undefined → invalidate 미실행 (early return).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  hostCreateCashGiftMutation: () => ({ mutationFn, mutationKey: ['hostCreateCashGift'] }),
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

import { useCreateCashGift } from './useCreateCashGift'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  mutationFn.mockReset()
})

describe('useCreateCashGift', () => {
  it('mutate → 내부 mutationFn 호출', async () => {
    mutationFn.mockResolvedValue({ id: 'g-1' })
    const { result } = renderHook(() => useCreateCashGift('w-1'), {
      wrapper: createQueryWrapper(),
    })
    const data = await result.current.mutateAsync({ path: { weddingId: 'w-1' }, body: { guest_name: 'g', relation_category: '친구/지인', amount: 50000, pay_method: 'cash' } })
    expect(mutationFn).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ id: 'g-1' })
  })

  it('weddingId 있음 + 성공 → listCashGiftsInfinite + summary 2개 invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'g-2' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateCashGift('w-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: { weddingId: 'w-2' }, body: { guest_name: 'g', relation_category: '친구/지인', amount: 50000, pay_method: 'cash' } })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['cashGifts', 'infinite', 'w-2'],
      })
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['cashGifts', 'summary', 'w-2'],
      })
    })
  })

  it('weddingId undefined → 성공해도 invalidate 미호출', async () => {
    mutationFn.mockResolvedValue({ id: 'g-3' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateCashGift(undefined), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: { weddingId: 'w-3' }, body: { guest_name: 'g', relation_category: '친구/지인', amount: 50000, pay_method: 'cash' } })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
