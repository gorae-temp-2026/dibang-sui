/**
 * useSignInWithPassword — 이메일/비밀번호 로그인 mutation.
 *
 * 책임:
 *  - supabase.auth.signInWithPassword({ email, password }) 호출
 *  - error → throw, 성공 시 반환값 없음
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const signInWithPassword = vi.fn()

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { signInWithPassword } }),
}))

import { useSignInWithPassword } from './useSignInWithPassword'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  signInWithPassword.mockReset()
})

describe('useSignInWithPassword', () => {
  it('성공 → supabase.auth.signInWithPassword({ email, password }) 호출', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useSignInWithPassword(), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync({ email: 'a@b.c', password: 'pw' })
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' })
  })

  it('error 반환 시 throw', async () => {
    const err = new Error('bad creds')
    signInWithPassword.mockResolvedValue({ error: err })
    const { result } = renderHook(() => useSignInWithPassword(), { wrapper: createQueryWrapper() })
    await expect(
      result.current.mutateAsync({ email: 'a@b.c', password: 'pw' }),
    ).rejects.toBe(err)
  })
})
