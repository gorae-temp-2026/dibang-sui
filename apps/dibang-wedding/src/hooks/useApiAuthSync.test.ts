/**
 * useApiAuthSync — SDK 클라이언트 헤더 동기화 effect 검증.
 *
 * 책임:
 *  - session.access_token 있음 → client.setConfig({ headers: { Authorization: 'Bearer <token>' }})
 *  - session=null 또는 토큰 없음 → client.setConfig({ headers: {} })
 *  - access_token 변경 시 effect 재실행 (deps: session?.access_token)
 *
 * @gorae/contracts/client.gen 를 vi.mock으로 가짜 setConfig 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

const setConfig = vi.fn()

vi.mock('@gorae/contracts/client.gen', () => ({
  client: { setConfig: (...args: unknown[]) => setConfig(...args) },
}))

import { useApiAuthSync } from './useApiAuthSync'

afterEach(() => {
  setConfig.mockClear()
})

const makeSession = (token: string | null): Session | null =>
  token === null
    ? null
    : ({ access_token: token, refresh_token: 'r', user: { id: 'u' } } as unknown as Session)

describe('useApiAuthSync', () => {
  it('session=null → setConfig({ headers: {} })로 헤더 제거', () => {
    renderHook(() => useApiAuthSync(null))
    expect(setConfig).toHaveBeenCalledTimes(1)
    expect(setConfig).toHaveBeenCalledWith({ headers: {} })
  })

  it('session.access_token 있음 → Authorization Bearer 헤더 설치', () => {
    renderHook(() => useApiAuthSync(makeSession('tok-1')))
    expect(setConfig).toHaveBeenCalledTimes(1)
    expect(setConfig).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer tok-1' } })
  })

  it('access_token 변경 시 effect 재실행 → 새 토큰으로 갱신', () => {
    const { rerender } = renderHook(({ s }: { s: Session | null }) => useApiAuthSync(s), {
      initialProps: { s: makeSession('tok-A') },
    })
    expect(setConfig).toHaveBeenLastCalledWith({ headers: { Authorization: 'Bearer tok-A' } })
    rerender({ s: makeSession('tok-B') })
    expect(setConfig).toHaveBeenLastCalledWith({ headers: { Authorization: 'Bearer tok-B' } })
  })

  it('같은 토큰 재렌더 → effect 재실행 안 함', () => {
    const session = makeSession('tok-X')
    const { rerender } = renderHook(({ s }: { s: Session | null }) => useApiAuthSync(s), {
      initialProps: { s: session },
    })
    expect(setConfig).toHaveBeenCalledTimes(1)
    rerender({ s: session })
    // deps가 access_token이므로 같은 token이면 effect 미실행
    expect(setConfig).toHaveBeenCalledTimes(1)
  })

  it('session.access_token 빈 문자열 → 헤더 제거 분기', () => {
    renderHook(() => useApiAuthSync(makeSession('')))
    expect(setConfig).toHaveBeenCalledWith({ headers: {} })
  })

  it('session 없고 devAuth 있음 → X-Dev-Auth 헤더 설치', () => {
    renderHook(() => useApiAuthSync(null, '0xdev'))
    expect(setConfig).toHaveBeenCalledWith({ headers: { 'X-Dev-Auth': '0xdev' } })
  })

  it('session 있으면 devAuth 무시하고 Authorization 우선', () => {
    renderHook(() => useApiAuthSync(makeSession('tok-1'), '0xdev'))
    expect(setConfig).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer tok-1' } })
  })
})
