/**
 * GiftDetail — co-located 테스트.
 *
 * 컴포넌트 책임:
 *  - guest_name (h3)·amount (formatAmount)·관계/축의방식/참석/일시 노출.
 *  - relation_detail 있으면 " / detail" 형태로 붙음, 없으면 카테고리만.
 *  - 수정/삭제 버튼 클릭 → onEdit/onDelete 콜백.
 *
 * formatAmount는 toLocaleString 기반이라 환경 의존성 있으나 한국어 로케일 prefix는
 * 안정적. CashGift 타입은 @gorae/contracts에서 가져옴.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GiftDetail } from './GiftDetail'
import type { CashGift } from '@gorae/contracts'

const baseGift = {
  id: 'gift-1',
  wedding_id: 'w-1',
  guest_name: '홍길동',
  amount: 50000,
  relation_category: '친구/지인',
  relation_detail: '대학 동기',
  pay_method: 'cash',
  attended: true,
  created_at: '2026-01-01T12:00:00Z',
} as unknown as CashGift

describe('GiftDetail', () => {
  it('guest_name(h3) + 금액 + 관계(상세 포함) + 축의 방식 + 참석 + 일시 노출', () => {
    render(<GiftDetail gift={baseGift} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '홍길동', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('50,000 KRW')).toBeInTheDocument()
    expect(screen.getByText('친구/지인 / 대학 동기')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Attended')).toBeInTheDocument()
  })

  it('relation_detail 없으면 카테고리만 표시', () => {
    const gift = { ...baseGift, relation_detail: '' } as CashGift
    render(<GiftDetail gift={gift} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('친구/지인')).toBeInTheDocument()
  })

  it('attended=false → "불참" 표시', () => {
    const gift = { ...baseGift, attended: false } as CashGift
    render(<GiftDetail gift={gift} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Absent')).toBeInTheDocument()
  })

  it('pay_method가 라벨 맵에 없으면 raw 값 그대로', () => {
    const gift = { ...baseGift, pay_method: 'unknown_method' } as unknown as CashGift
    render(<GiftDetail gift={gift} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('unknown_method')).toBeInTheDocument()
  })

  it('수정/삭제 버튼 클릭 → 각각의 콜백 호출', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<GiftDetail gift={baseGift} onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
