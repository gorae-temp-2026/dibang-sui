/**
 * useHostInvites — 1파일 3 hooks(list/create/cancel).
 *
 * 책임:
 *  - useHostInviteList(weddingId): enabled=!!weddingId, listHostInvites 호출.
 *  - useCreateHostInvite(weddingId): createHostInvite mutation. 성공 시
 *    ['hostInvites', weddingId] invalidate.
 *  - useCancelHostInvite(weddingId): cancelHostInvite mutation. 성공 시
 *    같은 query invalidate.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const listHostInvites = vi.fn()
const createHostInvite = vi.fn()
const cancelHostInvite = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  listHostInvites: (...args: unknown[]) => listHostInvites(...args),
  createHostInvite: (...args: unknown[]) => createHostInvite(...args),
  cancelHostInvite: (...args: unknown[]) => cancelHostInvite(...args),
}))

import {
  useHostInviteList,
  useCreateHostInvite,
  useCancelHostInvite,
} from './useHostInvites'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  listHostInvites.mockReset()
  createHostInvite.mockReset()
  cancelHostInvite.mockReset()
})

describe('useHostInviteList', () => {
  it('weddingId 비어있음 → disabled', () => {
    const { result } = renderHook(() => useHostInviteList(''), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(listHostInvites).not.toHaveBeenCalled()
  })

  it('weddingId 있음 → fetch + data 반환', async () => {
    listHostInvites.mockResolvedValue({ data: [{ id: 'i-1' }] })
    const { result } = renderHook(() => useHostInviteList('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listHostInvites).toHaveBeenCalledWith({
      path: { weddingId: 'w-1' },
      throwOnError: true,
    })
    expect(result.current.data).toEqual([{ id: 'i-1' }])
  })
})

describe('useCreateHostInvite', () => {
  it('mutate → createHostInvite + 성공 후 hostInvites invalidate', async () => {
    createHostInvite.mockResolvedValue({ data: { id: 'inv-1' } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateHostInvite('w-2'), {
      wrapper: createQueryWrapper(client),
    })
    const data = await result.current.mutateAsync('groom_father')
    expect(createHostInvite).toHaveBeenCalledWith({
      path: { weddingId: 'w-2' },
      body: { slot: 'groom_father' },
      throwOnError: true,
    })
    expect(data).toEqual({ id: 'inv-1' })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['hostInvites', 'w-2'] }),
    )
  })
})

describe('useCancelHostInvite', () => {
  it('mutate → cancelHostInvite + 성공 후 hostInvites invalidate', async () => {
    cancelHostInvite.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCancelHostInvite('w-3'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync('inv-99')
    expect(cancelHostInvite).toHaveBeenCalledWith({
      path: { weddingId: 'w-3', inviteId: 'inv-99' },
      throwOnError: true,
    })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['hostInvites', 'w-3'] }),
    )
  })
})
