/**
 * useSignInWithGoogle — Google OAuth 로그인 mutation.
 *
 * 책임:
 *  - supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }) 호출
 *  - error → throw, data → return
 *
 * `../../lib/supabase` 의 getSupabaseClient를 vi.mock으로 가짜 supabase 객체 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const signInWithOAuth = vi.fn()

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { signInWithOAuth } }),
}))

import { useSignInWithGoogle } from './useSignInWithGoogle'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  signInWithOAuth.mockReset()
})

describe('useSignInWithGoogle', () => {
  it('성공 → supabase.auth.signInWithOAuth({ provider: google, redirectTo }) 호출 + data 반환', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://oauth/' }, error: null })
    const { result } = renderHook(() => useSignInWithGoogle(), { wrapper: createQueryWrapper() })
    const data = await result.current.mutateAsync({ redirectTo: 'https://app/callback' })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app/callback' },
    })
    expect(data).toEqual({ url: 'https://oauth/' })
  })

  it('error 객체 반환 시 throw', async () => {
    const err = new Error('oauth failed')
    signInWithOAuth.mockResolvedValue({ data: null, error: err })
    const { result } = renderHook(() => useSignInWithGoogle(), { wrapper: createQueryWrapper() })
    await expect(result.current.mutateAsync({ redirectTo: 'x' })).rejects.toBe(err)
  })

  it('isPending: 호출 중 true, 종료 후 false', async () => {
    let resolve!: (v: unknown) => void
    signInWithOAuth.mockReturnValue(new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useSignInWithGoogle(), { wrapper: createQueryWrapper() })
    result.current.mutate({ redirectTo: 'x' })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    resolve({ data: null, error: null })
    await waitFor(() => expect(result.current.isPending).toBe(false))
  })
})
