/**
 * useGetMe — getMeOptions wrapper.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getMeOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMeOptions: (...args: unknown[]) => getMeOptions(...args),
}))

import { useGetMe } from './useGetMe'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => getMeOptions.mockReset())

describe('useGetMe', () => {
  it('getMeOptions 기반 fetch + data 반환', async () => {
    getMeOptions.mockReturnValue({
      queryKey: ['me'],
      queryFn: async () => ({ id: 'u-1', name: '홍길동' }),
    })
    const { result } = renderHook(() => useGetMe(), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 'u-1', name: '홍길동' })
  })
})
