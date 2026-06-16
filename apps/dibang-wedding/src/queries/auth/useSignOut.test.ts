/**
 * useSignOut — 로그아웃 mutation.
 *
 * 책임:
 *  - supabase.auth.signOut() 호출
 *  - error → throw, 성공 시 반환값 없음
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const signOut = vi.fn()

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { signOut } }),
}))

import { useSignOut } from './useSignOut'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  signOut.mockReset()
})

describe('useSignOut', () => {
  it('성공 → supabase.auth.signOut() 호출', async () => {
    signOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync()
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('error 반환 시 throw', async () => {
    const err = new Error('signout failed')
    signOut.mockResolvedValue({ error: err })
    const { result } = renderHook(() => useSignOut(), { wrapper: createQueryWrapper() })
    await expect(result.current.mutateAsync()).rejects.toBe(err)
  })
})
