/**
 * useCreateWedding — 생성된 createWeddingMutation()을 spread + onSuccess invalidate.
 *
 * 책임:
 *  - useMutation에 createWeddingMutation()의 옵션 spread.
 *  - 성공 후 myWeddings invalidate.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createWeddingMutation: () => ({ mutationFn, mutationKey: ['createWedding'] }),
  getMyWeddingsQueryKey: () => ['myWeddings'],
}))

import { useCreateWedding } from './useCreateWedding'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  mutationFn.mockReset()
})

describe('useCreateWedding', () => {
  it('mutate → 내부 mutationFn 호출 + 데이터 반환', async () => {
    mutationFn.mockResolvedValue({ id: 'w-1' })
    const { result } = renderHook(() => useCreateWedding(), { wrapper: createQueryWrapper() })
    const data = await result.current.mutateAsync({ body: { info: { groom_name: 'g', bride_name: 'b', date: '2026-01-01', time: '12:00', venue: { venue_name: 'v', venue_address: 'a' } }, hosts: {}, slug: 's' } })
    expect(mutationFn).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ id: 'w-1' })
  })

  it('성공 후 myWeddings invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'w-2' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateWedding(), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ body: { info: { groom_name: 'g', bride_name: 'b', date: '2026-01-01', time: '12:00', venue: { venue_name: 'v', venue_address: 'a' } }, hosts: {}, slug: 's' } })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] }),
    )
  })
})
