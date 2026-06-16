/**
 * useCreateSharedPhoto — generated mutation + listSharedPhotos invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createSharedPhotoMutation: () => ({ mutationFn, mutationKey: ['createSharedPhoto'] }),
  listSharedPhotosQueryKey: ({ path }: { path: { loungeId: string } }) => ['shared-photos', path.loungeId],
}))

import { useCreateSharedPhoto } from './useCreateSharedPhoto'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => mutationFn.mockReset())

describe('useCreateSharedPhoto', () => {
  it('mutate → mutationFn + listSharedPhotos invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'sp-1' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateSharedPhoto('l-1'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ path: {}, body: {} } as never)
    expect(mutationFn).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shared-photos', 'l-1'] }))
  })
})
