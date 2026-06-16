/**
 * useReplaceCurated — generated mutation + memoryBook invalidate (weddingId 가드).
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  replaceWeddingMemoryBookPhotosMutation: () => ({ mutationFn, mutationKey: ['replaceCurated'] }),
  getWeddingMemoryBookQueryKey: ({ path }: { path: { weddingId: string } }) => ['memoryBook', path.weddingId],
}))

import { useReplaceCurated } from './useReplaceCurated'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => mutationFn.mockReset())

describe('useReplaceCurated', () => {
  it('weddingId 있음 + 성공 → memoryBook invalidate', async () => {
    mutationFn.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useReplaceCurated('w-1'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: {}, body: {} } as never)
    expect(mutationFn).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['memoryBook', 'w-1'] }))
  })

  it('weddingId undefined → invalidate 미호출 (early return)', async () => {
    mutationFn.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useReplaceCurated(undefined), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: {}, body: {} } as never)
    expect(invalidate).not.toHaveBeenCalled()
  })
})
