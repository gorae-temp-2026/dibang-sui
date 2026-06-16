/**
 * useCreateLoungeCheckIn — createLoungeCheckIn mutation + invalidate by loungeId.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createLoungeCheckIn = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createLoungeCheckIn: (...args: unknown[]) => createLoungeCheckIn(...args),
}))

import { useCreateLoungeCheckIn } from './useCreateLoungeCheckIn'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createLoungeCheckIn.mockReset()
})

describe('useCreateLoungeCheckIn', () => {
  it('성공: createLoungeCheckIn(path/body) 호출 + data 반환', async () => {
    createLoungeCheckIn.mockResolvedValue({ data: { id: 'ci-1' } })
    const { result } = renderHook(() => useCreateLoungeCheckIn(), {
      wrapper: createQueryWrapper(),
    })
    const data = await result.current.mutateAsync({
      loungeId: 'l-1',
      body: { guest_name: 'g' } as never,
    })
    expect(createLoungeCheckIn).toHaveBeenCalledWith({
      path: { loungeId: 'l-1' },
      body: { guest_name: 'g' },
      throwOnError: true,
    })
    expect(data).toEqual({ id: 'ci-1' })
  })

  it('성공 후 ["lounge-check-in", "me", loungeId] invalidate', async () => {
    createLoungeCheckIn.mockResolvedValue({ data: { id: 'ci-2' } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateLoungeCheckIn(), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ loungeId: 'l-2', body: {} as never })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lounge-check-in', 'me', 'l-2'] }),
    )
  })
})
