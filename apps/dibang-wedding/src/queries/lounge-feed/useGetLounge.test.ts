/**
 * useGetLounge — getLoungeOptions wrapper + enabled gate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getLoungeOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getLoungeOptions: (...args: unknown[]) => getLoungeOptions(...args),
}))

import { useGetLounge } from './useGetLounge'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => getLoungeOptions.mockReset())

describe('useGetLounge', () => {
  it('loungeId 빈문자 → disabled', () => {
    getLoungeOptions.mockReturnValue({ queryKey: ['lounge'], queryFn: async () => null })
    const { result } = renderHook(() => useGetLounge(''), { wrapper: createQueryWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('loungeId 있음 → fetch + data 반환', async () => {
    getLoungeOptions.mockReturnValue({
      queryKey: ['lounge', 'l-1'],
      queryFn: async () => ({ id: 'l-1', name: 'A' }),
    })
    const { result } = renderHook(() => useGetLounge('l-1'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getLoungeOptions).toHaveBeenCalledWith({ path: { loungeId: 'l-1' } })
    expect(result.current.data).toEqual({ id: 'l-1', name: 'A' })
  })
})
