/**
 * useAcceptHostInvite — host invite 수락 mutation.
 *
 * 책임:
 *  - acceptHostInvite({ path: { token }, throwOnError: true }) 호출
 *  - 성공 시 data 반환
 *  - 성공 후 ['hostInvite', token] 쿼리 invalidate
 *
 * `@gorae/contracts/sdk.gen`의 acceptHostInvite를 vi.mock으로 가짜 함수 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const acceptHostInvite = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  acceptHostInvite: (...args: unknown[]) => acceptHostInvite(...args),
}))

import { useAcceptHostInvite } from './useAcceptHostInvite'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  acceptHostInvite.mockReset()
})

describe('useAcceptHostInvite', () => {
  it('성공 → acceptHostInvite({ path: { token }, throwOnError: true }) 호출 + data 반환', async () => {
    acceptHostInvite.mockResolvedValue({ data: { accepted: true } })
    const { result } = renderHook(() => useAcceptHostInvite('tok-1'), {
      wrapper: createQueryWrapper(),
    })
    const data = await result.current.mutateAsync()
    expect(acceptHostInvite).toHaveBeenCalledWith({
      path: { token: 'tok-1' },
      throwOnError: true,
    })
    expect(data).toEqual({ accepted: true })
  })

  it('성공 후 ["hostInvite", token] 쿼리 invalidate', async () => {
    acceptHostInvite.mockResolvedValue({ data: {} })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAcceptHostInvite('tok-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync()
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['hostInvite', 'tok-2'] })
    })
  })
})
