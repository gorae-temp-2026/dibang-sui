/**
 * useUpdateMe — updateMe mutation + getMe invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const updateMe = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  updateMe: (...args: unknown[]) => updateMe(...args),
}))
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMeQueryKey: () => ['me'],
}))

import { useUpdateMe } from './useUpdateMe'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => updateMe.mockReset())

describe('useUpdateMe', () => {
  it('성공: updateMe(body, throwOnError) 호출 + data 반환', async () => {
    updateMe.mockResolvedValue({ data: { id: 'u-1', name: '홍' } })
    const { result } = renderHook(() => useUpdateMe(), { wrapper: createQueryWrapper() })
    const data = await result.current.mutateAsync({ name: '홍' } as never)
    expect(updateMe).toHaveBeenCalledWith({ body: { name: '홍' }, throwOnError: true })
    expect(data).toEqual({ id: 'u-1', name: '홍' })
  })

  it('성공 후 getMe invalidate', async () => {
    updateMe.mockResolvedValue({ data: {} })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateMe(), { wrapper: createQueryWrapper(client) })
    await result.current.mutateAsync({} as never)
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] }))
  })
})
