/**
 * useGetLoungeCheckIns — listLoungeCheckInsOptions wrapper + placeId enabled.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listLoungeCheckInsOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listLoungeCheckInsOptions: (...args: unknown[]) => listLoungeCheckInsOptions(...args),
}))

import { useGetLoungeCheckIns } from './useGetLoungeCheckIns'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => listLoungeCheckInsOptions.mockReset())

describe('useGetLoungeCheckIns', () => {
  it('placeId undefined → disabled', () => {
    listLoungeCheckInsOptions.mockReturnValue({ queryKey: [], queryFn: async () => null })
    const { result } = renderHook(() => useGetLoungeCheckIns(undefined), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('placeId 있음 → fetch + limit 100 전달', async () => {
    listLoungeCheckInsOptions.mockReturnValue({
      queryKey: ['lc', 'p-1'],
      queryFn: async () => [{ id: 'c-1' }],
    })
    const { result } = renderHook(() => useGetLoungeCheckIns('p-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listLoungeCheckInsOptions).toHaveBeenCalledWith({
      path: { placeId: 'p-1' },
      query: { limit: 100 },
    })
  })
})
