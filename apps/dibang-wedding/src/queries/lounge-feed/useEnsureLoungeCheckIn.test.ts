/**
 * useEnsureLoungeCheckIn — 마운트 1회 자동 createLoungeCheckIn.
 *
 * 책임:
 *  - loungeId 있음 → useEffect에서 mutate({ path: { loungeId } }) 1회.
 *  - createdRef로 중복 호출 방지 (React 19 strict re-mount는 더블 호출 허용).
 *  - loungeId undefined → mutate 미호출.
 *  - 실패는 무시(별도 throw 없음).
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mutationFn = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createLoungeCheckInMutation: () => ({ mutationFn, mutationKey: ['createLoungeCheckIn'] }),
}))

import { useEnsureLoungeCheckIn } from './useEnsureLoungeCheckIn'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => mutationFn.mockReset())

describe('useEnsureLoungeCheckIn', () => {
  it('loungeId 있음 → mutate 호출', async () => {
    mutationFn.mockResolvedValue(null)
    renderHook(() => useEnsureLoungeCheckIn('l-1'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(mutationFn).toHaveBeenCalled())
    const arg = mutationFn.mock.calls[0][0]
    expect(arg).toEqual({ path: { loungeId: 'l-1' } })
  })

  it('loungeId undefined → mutate 미호출', () => {
    renderHook(() => useEnsureLoungeCheckIn(undefined), { wrapper: createQueryWrapper() })
    expect(mutationFn).not.toHaveBeenCalled()
  })

  it('mutation 실패해도 throw 없음(무시)', async () => {
    mutationFn.mockRejectedValue(new Error('fail'))
    expect(() =>
      renderHook(() => useEnsureLoungeCheckIn('l-2'), { wrapper: createQueryWrapper() }),
    ).not.toThrow()
    await waitFor(() => expect(mutationFn).toHaveBeenCalled())
  })
})
