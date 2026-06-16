/**
 * AuthContext — createContext + useAuth 훅의 자동 분리 검증.
 *
 * 책임:
 *  - Provider 없을 때: default { session: null, isReady: false } 반환.
 *  - Provider 안에서: 주입된 value를 그대로 반환.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, useAuth } from './AuthContext'
import type { ReactNode } from 'react'

describe('useAuth', () => {
  it('Provider 없으면 default value { session: null, isReady: false } 반환', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current).toEqual({ session: null, isReady: false })
  })

  it('Provider 안: 주입된 value 그대로 반환', () => {
    const fakeSession = { access_token: 'a' } as unknown as Session
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={{ session: fakeSession, isReady: true }}>
        {children}
      </AuthContext.Provider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.session).toBe(fakeSession)
    expect(result.current.isReady).toBe(true)
  })
})
