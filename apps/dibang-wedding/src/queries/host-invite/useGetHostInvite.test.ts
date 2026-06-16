/**
 * useGetHostInvite — host invite 조회 query.
 *
 * 책임:
 *  - enabled: !!token (undefined → disabled)
 *  - queryKey: ['hostInvite', token]
 *  - getHostInvite({ path: { token }, throwOnError: true }) 호출
 *  - 응답 data 반환
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getHostInvite = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  getHostInvite: (...args: unknown[]) => getHostInvite(...args),
}))

import { useGetHostInvite } from './useGetHostInvite'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  getHostInvite.mockReset()
})

describe('useGetHostInvite', () => {
  it('token=undefined → disabled (queryFn 미호출)', async () => {
    getHostInvite.mockResolvedValue({ data: 'never' })
    const { result } = renderHook(() => useGetHostInvite(undefined), {
      wrapper: createQueryWrapper(),
    })
    // disabled 쿼리는 즉시 idle/pending이지만 fetch 안 함
    expect(result.current.fetchStatus).toBe('idle')
    expect(getHostInvite).not.toHaveBeenCalled()
  })

  it('token 있음 → getHostInvite 호출 + data 반환', async () => {
    getHostInvite.mockResolvedValue({ data: { id: 'invite-1', token: 'tok-1' } })
    const { result } = renderHook(() => useGetHostInvite('tok-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getHostInvite).toHaveBeenCalledWith({
      path: { token: 'tok-1' },
      throwOnError: true,
    })
    expect(result.current.data).toEqual({ id: 'invite-1', token: 'tok-1' })
  })
})
