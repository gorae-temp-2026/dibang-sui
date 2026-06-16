/**
 * useCheckMyCheckIn — getMyLoungeCheckIn 조회, 404 → null, 그 외 throw.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getMyLoungeCheckIn = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  getMyLoungeCheckIn: (...args: unknown[]) => getMyLoungeCheckIn(...args),
}))

import { useCheckMyCheckIn } from './useCheckMyCheckIn'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  getMyLoungeCheckIn.mockReset()
})

describe('useCheckMyCheckIn', () => {
  it('loungeId undefined → disabled', () => {
    const { result } = renderHook(() => useCheckMyCheckIn(undefined, true), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getMyLoungeCheckIn).not.toHaveBeenCalled()
  })

  it('enabled=false → disabled (loungeId 있어도)', () => {
    const { result } = renderHook(() => useCheckMyCheckIn('l-1', false), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  // hey-api 클라이언트는 throwOnError 미지정(false) 시 에러를 throw하지 않고
  // { data, error, response } 를 resolve 한다. 따라서 실제 런타임 형태로 모킹한다.
  // (이전 테스트는 mockRejectedValue({ response: { status } }) 로 클라이언트가 내지 않는
  //  형태를 모킹해 버그를 가렸다 — #52)
  it('200 응답 → data 반환', async () => {
    getMyLoungeCheckIn.mockResolvedValue({
      data: { id: 'e-1' },
      response: { status: 200, ok: true },
    })
    const { result } = renderHook(() => useCheckMyCheckIn('l-2', true), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 'e-1' })
  })

  it('404 → null 반환 (isSuccess + data=null)', async () => {
    getMyLoungeCheckIn.mockResolvedValue({
      error: '체크인 없음',
      response: { status: 404, ok: false },
    })
    const { result } = renderHook(() => useCheckMyCheckIn('l-3', true), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('500 등 다른 에러 → throw → isError true', async () => {
    getMyLoungeCheckIn.mockResolvedValue({
      error: '서버 오류',
      response: { status: 500, ok: false },
    })
    const { result } = renderHook(() => useCheckMyCheckIn('l-4', true), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
