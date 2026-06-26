/**
 * LoginPage — smoke + key 인터랙션.
 *
 * 책임:
 *  - 헤더(dibang 워드마크/로그인)·구글 버튼·DEV 모드 입력 노출 (test env는 DEV=true).
 *  - 이미 로그인된 사용자 (session + isReady) → redirect 또는 /my-wedding으로 navigate.
 *  - 구글 버튼 클릭 → useZkLogin().login(callbackUrl) 호출.
 *  - 이메일 입력 비어있으면 alert + mutate 미호출.
 *  - 이메일·비밀번호 채우고 로그인 클릭 → useSignInWithPassword.mutate.
 *
 * i18n: useT()는 기본 언어 'en'(i18n.ts) — 화면 텍스트는 영어로 검증한다.
 *
 * vi.mock: react-router(useNavigate/useSearchParams), useAuth, useZkLogin,
 * useSignInWithPassword, env.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const useAuth = vi.fn()
const zkLogin = vi.fn()
const zkDevLogin = vi.fn()
const passwordMutate = vi.fn()
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
vi.mock('../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({
    login: zkLogin,
    devLogin: zkDevLogin,
    isAuthenticated: false,
    address: null,
  }),
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
  sessionStorage.clear()
  useAuth.mockReturnValue({ session: null, isReady: true })
  zkLogin.mockResolvedValue(undefined)
})

afterEach(() => {
  navigate.mockReset()
  useAuth.mockReset()
  zkLogin.mockReset()
  zkDevLogin.mockReset()
  passwordMutate.mockReset()
  passwordState.isPending = false
  // alert spy 해제
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('헤더 + 구글 버튼 노출', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'dibang' })).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
  })

  it('DEV 모드: 이메일·비밀번호 입력 + 이메일로 로그인 버튼 노출', () => {
    // vitest는 test env에서 import.meta.env.DEV=true
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeInTheDocument()
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

  it('구글 버튼 클릭 → zk.login(callbackUrl)', async () => {
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    expect(zkLogin).toHaveBeenCalledTimes(1)
    expect(zkLogin.mock.calls[0][0]).toBe('http://site.test/auth/callback')
  })

  it('redirect 쿼리 있을 때 구글 클릭 → 복귀 경로를 sessionStorage에 저장', async () => {
    setSearch('?redirect=%2Fwedding%2F88')
    useAuth.mockReturnValue({ session: null, isReady: true })
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    // callback URL은 항상 고정(Google Console 등록값). 복귀 경로는 sessionStorage로 전달.
    expect(zkLogin.mock.calls[0][0]).toBe('http://site.test/auth/callback')
    expect(sessionStorage.getItem('dibang.login.redirect')).toBe('/wedding/88')
  })

  it('이메일/비번 비어있고 로그인 버튼 클릭 → window.alert + passwordMutate 미호출', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(alertSpy).toHaveBeenCalled()
    expect(passwordMutate).not.toHaveBeenCalled()
  })

  it('이메일·비번 채우고 로그인 → passwordMutate({ email, password })', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pw1234' } })
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(passwordMutate).toHaveBeenCalledTimes(1)
    expect(passwordMutate.mock.calls[0][0]).toEqual({ email: 'test@example.com', password: 'pw1234' })
  })

  it('구글 로그인 진행 중(zk.login pending) → 모든 버튼 disabled', async () => {
    // zk.login이 resolve되지 않는 동안 머신은 signingGoogle 상태 → isDisabled.
    let resolveLogin: () => void = () => {}
    zkLogin.mockReturnValue(new Promise<void>((res) => { resolveLogin = res }))
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeDisabled()
    resolveLogin()
  })

  it('이메일 로그인 진행 중 → 버튼 라벨 "Signing in..."', async () => {
    // mutate가 콜백을 부르지 않으면 머신은 signingPassword 상태 유지.
    passwordMutate.mockImplementation(() => {})
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pw' } })
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })
})
