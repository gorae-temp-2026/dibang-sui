/**
 * LoginPage — smoke + key 인터랙션.
 *
 * 책임:
 *  - 헤더(dibang 워드마크/로그인)·구글 버튼·DEV 모드 입력 노출 (test env는 DEV=true).
 *  - 이미 로그인된 사용자 (session + isReady) → redirect 또는 /my-wedding으로 navigate.
 *  - 구글 버튼 클릭 → useSignInWithGoogle.mutate({ redirectTo }) 호출.
 *  - 이메일 입력 비어있으면 alert + mutate 미호출.
 *  - 이메일·비밀번호 채우고 로그인 클릭 → useSignInWithPassword.mutate.
 *
 * vi.mock: react-router(useNavigate/useSearchParams), useAuth, useSignInWithGoogle,
 * useSignInWithPassword, env.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const useAuth = vi.fn()
const googleMutate = vi.fn()
const passwordMutate = vi.fn()
const googleState = { isPending: false }
const passwordState = { isPending: false }

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigate,
    useSearchParams: () => [new URLSearchParams(window.location.search), vi.fn()],
  }
})
vi.mock('../providers/AuthContext', () => ({
  useAuth: () => useAuth(),
}))
vi.mock('../queries/auth/useSignInWithGoogle', () => ({
  useSignInWithGoogle: () => ({ mutate: googleMutate, isPending: googleState.isPending }),
}))
vi.mock('../queries/auth/useSignInWithPassword', () => ({
  useSignInWithPassword: () => ({ mutate: passwordMutate, isPending: passwordState.isPending }),
}))
vi.mock('../env', () => ({
  env: { VITE_SITE_URL: 'http://site.test' },
}))

import { LoginPage } from './LoginPage'

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/login${qs}`)
}

beforeEach(() => {
  setSearch('')
  useAuth.mockReturnValue({ session: null, isReady: true })
})

afterEach(() => {
  navigate.mockReset()
  useAuth.mockReset()
  googleMutate.mockReset()
  passwordMutate.mockReset()
  googleState.isPending = false
  passwordState.isPending = false
  // alert spy 해제
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('헤더 + 구글 버튼 노출', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'dibang' })).toBeInTheDocument()
    expect(screen.getByText('로그인')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /구글로 계속하기/ })).toBeInTheDocument()
  })

  it('DEV 모드: 이메일·비밀번호 입력 + 이메일로 로그인 버튼 노출', () => {
    // vitest는 test env에서 import.meta.env.DEV=true
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이메일로 로그인' })).toBeInTheDocument()
  })

  it('이미 로그인 + redirect 없음 → /my-wedding으로 navigate', () => {
    useAuth.mockReturnValue({ session: { access_token: 'a' }, isReady: true })
    render(<LoginPage />)
    expect(navigate).toHaveBeenCalledWith('/my-wedding', { replace: true })
  })

  it('이미 로그인 + 안전한 redirect → 그 경로로', () => {
    useAuth.mockReturnValue({ session: { access_token: 'a' }, isReady: true })
    setSearch('?redirect=%2Fwedding%2F77')
    render(<LoginPage />)
    expect(navigate).toHaveBeenCalledWith('/wedding/77', { replace: true })
  })

  it('구글 버튼 클릭 → useSignInWithGoogle.mutate({ redirectTo })', async () => {
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /구글로 계속하기/ }))
    expect(googleMutate).toHaveBeenCalledTimes(1)
    const arg = googleMutate.mock.calls[0][0]
    expect(arg.redirectTo).toBe('http://site.test/auth/callback')
  })

  it('redirect 쿼리 있을 때 구글 클릭 → redirectTo에 redirect 쿼리 부착', async () => {
    setSearch('?redirect=%2Fwedding%2F88')
    useAuth.mockReturnValue({ session: null, isReady: true })
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /구글로 계속하기/ }))
    const arg = googleMutate.mock.calls[0][0]
    expect(arg.redirectTo).toBe('http://site.test/auth/callback?redirect=%2Fwedding%2F88')
  })

  it('이메일/비번 비어있고 로그인 버튼 클릭 → window.alert + passwordMutate 미호출', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: '이메일로 로그인' }))
    expect(alertSpy).toHaveBeenCalled()
    expect(passwordMutate).not.toHaveBeenCalled()
  })

  it('이메일·비번 채우고 로그인 → passwordMutate({ email, password })', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('이메일'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'pw1234' } })
    await userEvent.click(screen.getByRole('button', { name: '이메일로 로그인' }))
    expect(passwordMutate).toHaveBeenCalledTimes(1)
    expect(passwordMutate.mock.calls[0][0]).toEqual({ email: 'test@example.com', password: 'pw1234' })
  })

  it('googleState.isPending=true → 모든 버튼 disabled', () => {
    googleState.isPending = true
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /구글로 계속하기/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이메일로 로그인' })).toBeDisabled()
  })

  it('passwordState.isPending=true → 이메일 로그인 버튼 "로그인 중..."', () => {
    passwordState.isPending = true
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: '로그인 중...' })).toBeDisabled()
  })
})
