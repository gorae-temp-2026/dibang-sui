/**
 * AuthProvider — 부트스트랩 실행 + children 렌더 검증.
 *
 * 책임:
 *  - mount 시 createAuthBootstrap().getInitialSession()을 호출하고 결과를 state에 반영.
 *  - 초기 로드 완료 전 (isReady=false): children 미렌더 (`return null`).
 *  - 초기 로드 완료 후: children 렌더 + context.value 노출.
 *  - subscribe 콜백을 통해 session이 갱신되면 children에 반영.
 *  - unmount 시 unsubscribe 호출.
 *  - session 변경마다 useApiAuthSync 트리거.
 *
 * createAuthBootstrap과 useApiAuthSync를 둘 다 vi.mock으로 가짜 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

type Subscriber = (event: unknown, session: Session | null) => void

let initialSession: Session | null = null
let captureSubscriber: Subscriber | null = null
const unsubscribe = vi.fn()
const apiAuthSync = vi.fn()

vi.mock('../lib/authBootstrap', () => ({
  createAuthBootstrap: () => ({
    getInitialSession: async () => initialSession,
    subscribe: (cb: Subscriber) => {
      captureSubscriber = cb
      return () => unsubscribe()
    },
  }),
}))

vi.mock('../hooks/useApiAuthSync', () => ({
  useApiAuthSync: (s: Session | null) => apiAuthSync(s),
}))

import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'

afterEach(() => {
  initialSession = null
  captureSubscriber = null
  unsubscribe.mockReset()
  apiAuthSync.mockReset()
})

function Probe() {
  const { session, isReady } = useAuth()
  return (
    <div>
      <span data-testid="ready">{String(isReady)}</span>
      <span data-testid="token">{session?.access_token ?? ''}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  it('초기 session null로 부트스트랩 → children 렌더, useApiAuthSync(null) 호출', async () => {
    initialSession = null
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    // getInitialSession 완료 후 children 렌더
    expect(await screen.findByTestId('ready')).toHaveTextContent('true')
    expect(screen.getByTestId('token')).toHaveTextContent('')
    expect(apiAuthSync).toHaveBeenLastCalledWith(null)
  })

  it('초기 session 있음 → children에 access_token 노출', async () => {
    initialSession = { access_token: 'tok-1' } as unknown as Session
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(await screen.findByTestId('token')).toHaveTextContent('tok-1')
  })

  it('subscribe 콜백 호출 → session state 갱신', async () => {
    initialSession = null
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByTestId('ready')
    expect(captureSubscriber).toBeTypeOf('function')
    act(() => {
      captureSubscriber?.('SIGNED_IN', { access_token: 'tok-2' } as unknown as Session)
    })
    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('tok-2')
    })
  })

  it('unmount → unsubscribe 호출 (React 19 strict mount 더블 cleanup 허용)', async () => {
    initialSession = null
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByTestId('ready')
    const before = unsubscribe.mock.calls.length
    unmount()
    // 마지막 unmount에서 최소 1회 추가 호출 보장 — strict mode 더블 mount는 count 무관
    expect(unsubscribe.mock.calls.length).toBeGreaterThan(before)
  })
})
