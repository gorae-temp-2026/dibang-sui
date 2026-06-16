/**
 * AccountEditor — co-located 테스트 (FRONTEND_TESTING.md § 파일 위치)
 *
 * 컴포넌트 책임:
 *  - label 텍스트를 렌더한다.
 *  - 전달된 slots 배열의 각 항목마다 AccountSlotRow를 1회씩 렌더한다.
 *
 * 검증:
 *  - label이 화면에 보인다.
 *  - 빈 slots: 행이 없다.
 *  - 3개 slot: role 텍스트 3개가 모두 보인다 (AccountSlotRow가 role을 표시).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccountEditor } from './AccountEditor'
import type { AccountSlot } from '../../hooks/invitation-create/useInvitationForm'

const makeSlot = (role: string): AccountSlot => ({
  role,
  name: '',
  bank: '',
  number: '',
  enabled: false,
})

describe('AccountEditor', () => {
  it('label을 렌더한다', () => {
    render(<AccountEditor label="신랑측 계좌" slots={[]} side="groom" />)
    expect(screen.getByText('신랑측 계좌')).toBeInTheDocument()
  })

  it('빈 slots: 행을 렌더하지 않는다', () => {
    const { container } = render(
      <AccountEditor label="신부측 계좌" slots={[]} side="bride" />,
    )
    // role 텍스트로 행을 식별 — 없어야 함
    expect(screen.queryByText('신랑')).not.toBeInTheDocument()
    expect(screen.queryByText('아버지')).not.toBeInTheDocument()
    // 컨테이너의 첫 div(루트) 자식은 label span 1개뿐
    const root = container.firstChild as HTMLElement
    expect(root.children).toHaveLength(1)
  })

  it('3개 slot: 각 role 텍스트가 모두 보인다', () => {
    const slots: AccountSlot[] = [
      makeSlot('신랑'),
      makeSlot('아버지'),
      makeSlot('어머니'),
    ]
    render(<AccountEditor label="신랑측 계좌" slots={slots} side="groom" />)
    expect(screen.getByText('신랑')).toBeInTheDocument()
    expect(screen.getByText('아버지')).toBeInTheDocument()
    expect(screen.getByText('어머니')).toBeInTheDocument()
  })

  it('side prop에 따라 AccountSlotRow가 같은 side로 렌더된다', () => {
    // AccountSlotRow가 enabled=true일 때만 입력 필드를 보여주므로
    // enabled 상태로 두 side를 따로 렌더 후 input의 값으로 구분.
    const groomSlots: AccountSlot[] = [
      { role: '신랑', name: '홍길동', bank: '국민', number: '111', enabled: true },
    ]
    const { unmount } = render(
      <AccountEditor label="신랑측" slots={groomSlots} side="groom" />,
    )
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument()
    expect(screen.getByDisplayValue('111')).toBeInTheDocument()
    unmount()

    const brideSlots: AccountSlot[] = [
      { role: '신부', name: '김영희', bank: '신한', number: '222', enabled: true },
    ]
    render(<AccountEditor label="신부측" slots={brideSlots} side="bride" />)
    expect(screen.getByDisplayValue('김영희')).toBeInTheDocument()
    expect(screen.getByDisplayValue('222')).toBeInTheDocument()
  })
})
