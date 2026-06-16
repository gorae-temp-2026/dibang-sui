/**
 * authBootstrap — Supabase 세션 부트스트랩 래퍼.
 *
 * 책임:
 *  - createAuthBootstrap()이 getInitialSession + subscribe 인터페이스 반환.
 *  - getInitialSession: supabase.auth.getSession() 결과의 session(또는 null) 반환.
 *  - subscribe: onAuthStateChange 구독 등록, 반환된 unsubscribe 함수로 해제.
 *
 * `./supabase`의 getSupabaseClient를 vi.mock으로 controlled fake 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const onAuthStateChange = vi.fn()
const unsubscribe = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
    },
  }),
}))

import { createAuthBootstrap } from './authBootstrap'

afterEach(() => {
  getSession.mockReset()
  onAuthStateChange.mockReset()
  unsubscribe.mockReset()
})

describe('createAuthBootstrap', () => {
  it('getInitialSession: getSession이 session 반환 → 그 session 반환', async () => {
    const fakeSession = { access_token: 'a' } as never
    getSession.mockResolvedValue({ data: { session: fakeSession } })
    const handle = createAuthBootstrap()
    const result = await handle.getInitialSession()
    expect(result).toBe(fakeSession)
  })

  it('getInitialSession: data.session=undefined → null 반환', async () => {
    getSession.mockResolvedValue({ data: {} })
    const handle = createAuthBootstrap()
    const result = await handle.getInitialSession()
    expect(result).toBeNull()
  })

  it('subscribe: onAuthStateChange에 콜백 등록 + unsubscribe 함수 반환', () => {
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })
    const handle = createAuthBootstrap()
    const onChange = vi.fn()
    const stop = handle.subscribe(onChange)
    expect(onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(onAuthStateChange).toHaveBeenCalledWith(onChange)
    expect(typeof stop).toBe('function')
    stop()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
