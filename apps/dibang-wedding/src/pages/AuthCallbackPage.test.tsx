/**
 * AuthCallbackPage — PKCE 콜백 처리 페이지 분기 검증.
 *
 * 책임:
 *  - !isReady → 아무것도 안 함 (대기).
 *  - session 있음 → redirect 쿼리(안전 검사 통과) 또는 /my-wedding으로 navigate.
 *  - session 없음 + code 쿼리 있음 → onAuthStateChange 대기.
 *  - session 없음 + code 없음 → /login (redirect 쿼리 보존) navigate.
 *  - 10초 타임아웃 → /login navigate.
 *
 * react-router의 useNavigate를 vi.mock으로 가짜 함수 노출. useAuth도 mock.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout (외부 인터랙션
 * 대기 금지. 본 spec은 의도적으로 vi.useFakeTimers로 시간 진행을 강제하는 것은 허용).
 */
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const useAuth = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigate }
})
vi.mock('../providers/AuthContext', () => ({
  useAuth: () => useAuth(),
}))

import { AuthCallbackPage } from './AuthCallbackPage'

function setSearch(qs: string) {
  // jsdom: history.replaceState로 window.location.search 강제 설정
  window.history.replaceState({}, '', `/auth/callback${qs}`)
}

beforeEach(() => {
  setSearch('')
})

afterEach(() => {
  navigate.mockReset()
  useAuth.mockReset()
  vi.useRealTimers()
})

describe('AuthCallbackPage', () => {
  it('!isReady → navigate 호출 안 함', () => {
    useAuth.mockReturnValue({ session: null, isReady: false })
    render(<AuthCallbackPage />)
    // 10초 타임아웃은 별도 effect라 navigate가 즉시 호출되지는 않음
    expect(navigate).not.toHaveBeenCalled()
  })

  it('isReady + session 있음 + redirect 없음 → /my-wedding (replace)', () => {
    useAuth.mockReturnValue({ session: { access_token: 'a' }, isReady: true })
    setSearch('')
    render(<AuthCallbackPage />)
    expect(navigate).toHaveBeenCalledWith('/my-wedding', { replace: true })
  })

  it('isReady + session + 안전한 redirect=/wedding/123 → 그 경로로', () => {
    useAuth.mockReturnValue({ session: { access_token: 'a' }, isReady: true })
    setSearch('?redirect=%2Fwedding%2F123')
    render(<AuthCallbackPage />)
    expect(navigate).toHaveBeenCalledWith('/wedding/123', { replace: true })
  })

  it.each([
    ['//evil.com', 'protocol-relative'],
    ['/login', '로그인 루프'],
    ['/auth/callback', '콜백 루프'],
  ])('isReady + session + 안전하지 않은 redirect=%s → /my-wedding 폴백 (%s)', (raw) => {
    useAuth.mockReturnValue({ session: { access_token: 'a' }, isReady: true })
    setSearch(`?redirect=${encodeURIComponent(raw)}`)
    render(<AuthCallbackPage />)
    expect(navigate).toHaveBeenCalledWith('/my-wedding', { replace: true })
  })

  it('isReady + session 없음 + code 없음 → /login (redirect 쿼리 보존)', () => {
    useAuth.mockReturnValue({ session: null, isReady: true })
    setSearch('?redirect=%2Fwedding%2F42')
    render(<AuthCallbackPage />)
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Fwedding%2F42', { replace: true })
  })

  it('isReady + session 없음 + code 있음 → 대기 (navigate 미호출)', () => {
    useAuth.mockReturnValue({ session: null, isReady: true })
    setSearch('?code=abc')
    render(<AuthCallbackPage />)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('10초 후 fallback navigate /login', () => {
    vi.useFakeTimers()
    useAuth.mockReturnValue({ session: null, isReady: true })
    setSearch('?code=abc')
    render(<AuthCallbackPage />)
    // 첫 effect는 navigate 안 함
    expect(navigate).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_001)
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})
