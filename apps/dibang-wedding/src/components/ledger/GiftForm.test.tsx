/**
 * GiftForm — co-located 테스트.
 *
 * 컴포넌트 책임:
 *  - useState 로컬 폼 state (zustand 의존 없음).
 *  - initial=undefined: 빈 폼.
 *  - initial=CashGift: prefilled.
 *  - isValid = name.trim().length > 0 && Number(amount) > 0 → 충족 시 submit 활성.
 *  - amount 입력은 숫자만 통과 (regex 필터).
 *  - amount 1,000원 단위 toLocaleString 미리보기.
 *  - isLoading=true: "처리 중..." + disabled.
 *  - 확인 클릭 → onSubmit(trim+number 변환 + 옵션 필드).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GiftForm } from './GiftForm'
import type { CashGift } from '@gorae/contracts'

describe('GiftForm', () => {
  it('initial 없음: 빈 폼 + 제목·submitLabel 노출 + submit disabled', () => {
    render(
      <GiftForm
        title="축의 추가"
        onSubmit={vi.fn()}
        submitLabel="저장"
        isLoading={false}
      />,
    )
    expect(screen.getByRole('heading', { name: '축의 추가' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('이름')).toHaveValue('')
    expect(screen.getByPlaceholderText('0')).toHaveValue('')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('initial=CashGift: prefilled', () => {
    const initial = {
      id: 'g',
      wedding_id: 'w',
      guest_name: '김영희',
      amount: 30000,
      relation_category: '동문/동창',
      relation_detail: '고등학교',
      pay_method: 'transfer',
      attended: true,
      created_at: '2026-01-01T00:00:00Z',
    } as unknown as CashGift
    render(
      <GiftForm
        title="수정"
        initial={initial}
        onSubmit={vi.fn()}
        submitLabel="수정"
        isLoading={false}
      />,
    )
    expect(screen.getByPlaceholderText('이름')).toHaveValue('김영희')
    expect(screen.getByPlaceholderText('0')).toHaveValue('30000')
  })

  it('이름·금액·관계·축의방식 채우면 submit 활성, 클릭 → onSubmit 호출(trim+number 변환)', async () => {
    const onSubmit = vi.fn()
    render(
      <GiftForm title="t" onSubmit={onSubmit} submitLabel="저장" isLoading={false} />,
    )
    fireEvent.change(screen.getByPlaceholderText('이름'), { target: { value: '  홍길동  ' } })
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '50000' } })
    // 관계·축의 방식도 필수(QA 2026-05-29): select 0=관계, 1=축의 방식
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '가족/친척' } })
    fireEvent.change(selects[1], { target: { value: 'cash' } })
    expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.guest_name).toBe('홍길동')
    expect(payload.amount).toBe(50000)
  })

  it('amount 입력: 숫자가 아닌 문자는 필터링', () => {
    render(
      <GiftForm title="t" onSubmit={vi.fn()} submitLabel="저장" isLoading={false} />,
    )
    const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: 'abc123def4' } })
    expect(amountInput.value).toBe('1234')
  })

  it('amount 입력 → 1,000 단위 미리보기 텍스트 노출', () => {
    render(
      <GiftForm title="t" onSubmit={vi.fn()} submitLabel="저장" isLoading={false} />,
    )
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '50000' } })
    expect(screen.getByText('50,000원')).toBeInTheDocument()
  })

  it('isLoading=true: "처리 중..." + disabled', () => {
    render(
      <GiftForm title="t" onSubmit={vi.fn()} submitLabel="저장" isLoading />,
    )
    const btn = screen.getByRole('button', { name: '처리 중...' })
    expect(btn).toBeDisabled()
  })

  it('금액이 0이면 submit disabled (이름 있어도)', () => {
    render(
      <GiftForm title="t" onSubmit={vi.fn()} submitLabel="저장" isLoading={false} />,
    )
    fireEvent.change(screen.getByPlaceholderText('이름'), { target: { value: '홍길동' } })
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '0' } })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
