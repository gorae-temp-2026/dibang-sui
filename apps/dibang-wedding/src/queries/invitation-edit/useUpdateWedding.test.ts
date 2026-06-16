/**
 * useUpdateWedding — updateWedding + optional updateInvitation + 2 invalidate.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const updateWedding = vi.fn()
const updateInvitation = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  updateWedding: (...args: unknown[]) => updateWedding(...args),
  updateInvitation: (...args: unknown[]) => updateInvitation(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMyWeddingsQueryKey: () => ['myWeddings'],
  getWeddingQueryKey: ({ path }: { path: { weddingId: string } }) => ['wedding', path.weddingId],
}))

import { useUpdateWedding } from './useUpdateWedding'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  updateWedding.mockReset()
  updateInvitation.mockReset()
})

describe('useUpdateWedding', () => {
  it('invitationReq 빈 → updateWedding만 호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-1', 'i-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: {} })
    expect(updateWedding).toHaveBeenCalledTimes(1)
    expect(updateInvitation).not.toHaveBeenCalled()
  })

  it('invitationReq.cover_image 있음 + invitationId 있음 → updateInvitation도 호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-2', 'i-2'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq: {},
      invitationReq: { cover_image: 'https://a/c.jpg' },
    })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-2', invitationId: 'i-2' },
      body: { cover_image: 'https://a/c.jpg' },
      throwOnError: true,
    })
  })

  it('invitationReq 채워졌어도 invitationId 빈 문자열 → updateInvitation 미호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-3', ''), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq: {},
      invitationReq: { custom_message: 'x' },
    })
    expect(updateInvitation).not.toHaveBeenCalled()
  })

  it('성공 후 myWeddings + wedding 2개 invalidate', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateWedding('w-4', 'i-4'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: {} })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wedding', 'w-4'] })
    })
  })
})
