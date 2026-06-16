/**
 * Toast — co-located 테스트 (trivial, 11 LOC).
 *
 * 컴포넌트 책임:
 *  - message 텍스트 노출.
 *  - 닫기 버튼(× 글리프) 클릭 → onClose 호출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  it('message 텍스트 노출', () => {
    render(<Toast message="저장에 실패했습니다" onClose={vi.fn()} />)
    expect(screen.getByText('저장에 실패했습니다')).toBeInTheDocument()
  })

  it('닫기 버튼 클릭 → onClose 호출', async () => {
    const onClose = vi.fn()
    render(<Toast message="msg" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
