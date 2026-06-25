/**
 * SlugModal — co-located 테스트.
 *
 * 컴포넌트 책임:
 *  - open=false: null 반환 (모달 미노출).
 *  - open=true: 헤더·안내문·slug 입력·돌아가기/확인 버튼.
 *  - slug 입력 → store.slug 갱신.
 *  - slugAvailability별로 안내 텍스트 + 색상 분기.
 *  - 확인 버튼 활성 조건: slug.trim().length >= 2 && availability === 'available'.
 *  - isPending=true: "저장 중..." + disabled.
 *  - onClose / onConfirm 콜백.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlugModal } from './SlugModal'
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm'

afterEach(() => {
  useInvitationForm.getState().reset()
})

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  isPending: false,
  slugAvailability: 'idle' as const,
}

describe('SlugModal', () => {
  it('open=false: 아무것도 렌더하지 않는다', () => {
    const { container } = render(<SlugModal {...baseProps} open={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('open=true: 헤더·안내문·돌아가기/확인 버튼 노출', () => {
    render(<SlugModal {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Share link settings' })).toBeInTheDocument()
    expect(screen.getByText(/Enter a unique link/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('slug 입력 → store.slug 갱신 (한 글자 단위)', () => {
    render(<SlugModal {...baseProps} />)
    const input = screen.getByPlaceholderText('my-wedding') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'mywed' } })
    expect(useInvitationForm.getState().slug).toBe('mywed')
  })

  it.each([
    ['checking', 'Checking...'],
    ['available', 'Available'],
    ['taken', 'Already taken'],
    ['error', 'Check failed'],
  ] as const)('slugAvailability=%s → 안내 텍스트 "%s" 노출', (status, expected) => {
    render(<SlugModal {...baseProps} slugAvailability={status} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('slugAvailability=idle: 안내 텍스트 비어있음', () => {
    render(<SlugModal {...baseProps} slugAvailability="idle" />)
    // 안내문은 별도 p로만 노출되므로 다른 안내 텍스트가 없어야 함
    expect(screen.queryByText('Checking...')).not.toBeInTheDocument()
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
  })

  it('확인 버튼: slug<2자 OR available 아니면 disabled', () => {
    useInvitationForm.getState().setField('slug', 'm')
    render(<SlugModal {...baseProps} slugAvailability="available" />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })

  it('확인 버튼: slug≥2자 + available + !isPending → 활성', () => {
    useInvitationForm.getState().setField('slug', 'mywed')
    render(<SlugModal {...baseProps} slugAvailability="available" />)
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled()
  })

  it('isPending=true: 확인 버튼 "저장 중..." + disabled', () => {
    useInvitationForm.getState().setField('slug', 'mywed')
    render(<SlugModal {...baseProps} slugAvailability="available" isPending />)
    const btn = screen.getByRole('button', { name: 'Saving...' })
    expect(btn).toBeDisabled()
  })

  it('돌아가기 클릭 → onClose, 확인 클릭(활성) → onConfirm', async () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    useInvitationForm.getState().setField('slug', 'mywed')
    render(<SlugModal {...baseProps} onClose={onClose} onConfirm={onConfirm} slugAvailability="available" />)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
