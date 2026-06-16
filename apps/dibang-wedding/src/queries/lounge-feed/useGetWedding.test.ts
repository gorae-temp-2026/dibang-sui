/**
 * useGetWedding — getWeddingOptions wrapper + weddingId enabled.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getWeddingOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getWeddingOptions: (...args: unknown[]) => getWeddingOptions(...args),
}))

import { useGetWedding } from './useGetWedding'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => getWeddingOptions.mockReset())

describe('useGetWedding', () => {
  it('weddingId undefined → disabled', () => {
    getWeddingOptions.mockReturnValue({ queryKey: [], queryFn: async () => null })
    const { result } = renderHook(() => useGetWedding(undefined), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('weddingId 있음 → fetch + data 반환', async () => {
    getWeddingOptions.mockReturnValue({
      queryKey: ['wedding', 'w-1'],
      queryFn: async () => ({ id: 'w-1' }),
    })
    const { result } = renderHook(() => useGetWedding('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getWeddingOptions).toHaveBeenCalledWith({ path: { weddingId: 'w-1' } })
    expect(result.current.data).toEqual({ id: 'w-1' })
  })
})
