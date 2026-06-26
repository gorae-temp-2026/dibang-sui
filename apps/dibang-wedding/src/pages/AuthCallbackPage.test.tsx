/**
 * AuthCallbackPage — zkLogin implicit flow 콜백 처리 분기 검증.
 *
 * 책임:
 *  - URL 프래그먼트에 id_token 없음 → 즉시 /login navigate.
 *  - id_token 있음 + completeLoginFromUrl() === true → 안전한 redirect(sessionStorage 또는
 *    ?redirect= 쿼리) 또는 /my-wedding navigate.
 *  - id_token 있음 + completeLoginFromUrl() === false → /login navigate.
 *  - id_token 있음 + completeLoginFromUrl() reject → /login navigate.
 *  - 10초 타임아웃 → /login navigate.
 *
 * react-router의 useNavigate를 vi.mock으로 가짜 함수 노출. ZkLoginProvider도 mock.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout (외부 인터랙션
 * 대기 금지. 본 spec은 의도적으로 vi.useFakeTimers로 시간 진행을 강제하는 것은 허용).
 */
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const completeLoginFromUrl = vi.fn().mockResolvedValue(false)

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigate }
})
vi.mock('../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({ completeLoginFromUrl, isAuthenticated: false, address: null }),
}))

import { AuthCallbackPage } from './AuthCallbackPage'

function setHash(hash: string) {
  window.history.replaceState({}, '', `/auth/callback${hash}`)
}

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/auth/callback${qs}`)
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  setHash('')
})

afterEach(() => {
  navigate.mockReset()
  completeLoginFromUrl.mockReset().mockResolvedValue(false)
  sessionStorage.clear()
  vi.useRealTimers()
  window.history.replaceState({}, '', '/auth/callback')
})

describe('AuthCallbackPage', () => {
  it('id_token 없음 → 즉시 /login navigate', () => {
    setHash('')
    render(<AuthCallbackPage />)
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
    expect(completeLoginFromUrl).not.toHaveBeenCalled()
  })

  it('id_token 있음 + 성공 + redirect 없음 → /my-wedding (replace)', async () => {
    completeLoginFromUrl.mockResolvedValue(true)
    setHash('#id_token=abc')
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/my-wedding', { replace: true })
  })

  it('id_token 있음 + 성공 + 안전한 redirect=/wedding/123 쿼리 → 그 경로로', async () => {
    completeLoginFromUrl.mockResolvedValue(true)
    setSearch('?redirect=%2Fwedding%2F123#id_token=abc')
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/wedding/123', { replace: true })
  })

  it('id_token 있음 + 성공 + sessionStorage redirect → 그 경로로 (쿼리보다 우선)', async () => {
    completeLoginFromUrl.mockResolvedValue(true)
    sessionStorage.setItem('dibang.login.redirect', '/wedding/99')
    setSearch('?redirect=%2Fwedding%2F123#id_token=abc')
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/wedding/99', { replace: true })
    expect(sessionStorage.getItem('dibang.login.redirect')).toBeNull()
  })

  it.each([
    ['//evil.com', 'protocol-relative'],
    ['/login', '로그인 루프'],
    ['/auth/callback', '콜백 루프'],
  ])('id_token + 성공 + 안전하지 않은 redirect=%s → /my-wedding 폴백 (%s)', async (raw) => {
    completeLoginFromUrl.mockResolvedValue(true)
    setSearch(`?redirect=${encodeURIComponent(raw)}#id_token=abc`)
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/my-wedding', { replace: true })
  })

  it('id_token 있음 + 실패(false) → /login navigate', async () => {
    completeLoginFromUrl.mockResolvedValue(false)
    setHash('#id_token=abc')
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('id_token 있음 + reject → /login navigate', async () => {
    completeLoginFromUrl.mockRejectedValue(new Error('proof fail'))
    setHash('#id_token=abc')
    render(<AuthCallbackPage />)
    await flush()
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('10초 후 fallback navigate /login', () => {
    vi.useFakeTimers()
    // id_token 없으면 즉시 /login이라 타임아웃 경로를 검증할 수 없음 → id_token 있고 pending인 상태로 둠
    completeLoginFromUrl.mockReturnValue(new Promise(() => {}))
    setHash('#id_token=abc')
    render(<AuthCallbackPage />)
    navigate.mockClear()
    vi.advanceTimersByTime(10_001)
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})
