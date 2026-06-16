/**
 * useRecordGuestbookMessageView — fire-and-forget 조회 기록 mutation.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const recordGuestbookMessageView = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  recordGuestbookMessageView: (...args: unknown[]) => recordGuestbookMessageView(...args),
}))

import { useRecordGuestbookMessageView } from './useRecordGuestbookMessageView'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => recordGuestbookMessageView.mockReset())

describe('useRecordGuestbookMessageView', () => {
  it('mutate(messageId) → recordGuestbookMessageView({ path: { messageId } })', async () => {
    recordGuestbookMessageView.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useRecordGuestbookMessageView(), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync('m-1')
    expect(recordGuestbookMessageView).toHaveBeenCalledWith({
      path: { messageId: 'm-1' },
      throwOnError: true,
    })
  })

  it('서버 에러 → reject', async () => {
    const err = new Error('fail')
    recordGuestbookMessageView.mockRejectedValue(err)
    const { result } = renderHook(() => useRecordGuestbookMessageView(), {
      wrapper: createQueryWrapper(),
    })
    await expect(result.current.mutateAsync('m-2')).rejects.toBe(err)
  })
})
