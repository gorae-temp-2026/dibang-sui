/**
 * AccountSlotRow — co-located 테스트 (FRONTEND_TESTING.md § 파일 위치)
 *
 * 컴포넌트 책임:
 *  - enabled=false: 체크박스 + role 텍스트만 노출.
 *  - enabled=true: 체크박스 + 예금주/은행/계좌번호 입력 노출.
 *  - 입력 변경 → zustand store updateAccountSlot 반영.
 *
 * 검증:
 *  - 분기별 렌더 (enabled false/true)
 *  - 체크박스 토글로 enabled 변경이 store에 반영
 *  - 이름 입력 변경이 store에 반영
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AccountSlotRow } from './AccountSlotRow'
import { useInvitationForm, type AccountSlot } from '../../hooks/invitation-create/useInvitationForm'

const slot = (overrides: Partial<AccountSlot> = {}): AccountSlot => ({
  role: '신랑',
  name: '',
  bank: '',
  number: '',
  enabled: false,
  ...overrides,
})

afterEach(() => {
  useInvitationForm.getState().reset()
})

describe('AccountSlotRow', () => {
  it('enabled=false: role 텍스트만 보이고 입력 필드는 숨김', () => {
    render(<AccountSlotRow slot={slot({ enabled: false })} side="groom" index={0} />)
    expect(screen.getByText('신랑')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Account holder')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Account number')).not.toBeInTheDocument()
  })

  it('enabled=true: 예금주/은행/계좌번호 입력이 모두 보인다', () => {
    render(
      <AccountSlotRow
        slot={slot({ enabled: true, name: '홍길동', bank: '국민은행', number: '123-456' })}
        side="groom"
        index={0}
      />,
    )
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123-456')).toBeInTheDocument()
    // bank는 BANK_LIST에 존재하는 값이어야 select.value가 매치됨
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('국민은행')
  })

  it('체크박스 토글 → store의 enabled가 갱신된다', async () => {
    // store 초기 state(groomAccounts[0].enabled === false) 기준
    render(<AccountSlotRow slot={slot({ enabled: false })} side="groom" index={0} />)
    const checkbox = screen.getByRole('checkbox')
    await userEvent.click(checkbox)
    expect(useInvitationForm.getState().groomAccounts[0].enabled).toBe(true)
  })

  it('이름 입력 한 글자 → store의 name이 그 값으로 갱신된다', async () => {
    // 이 컴포넌트는 props.slot으로 controlled 되므로, 테스트에서
    // 부모 wiring 없이는 userEvent.type 누적값이 input에 머무르지 않는다.
    // 따라서 한 글자(또는 fireEvent.change 단발) 단위로 store 반영만 검증.
    render(
      <AccountSlotRow
        slot={slot({ enabled: true, name: '' })}
        side="bride"
        index={1}
      />,
    )
    const nameInput = screen.getByPlaceholderText('Account holder')
    await userEvent.type(nameInput, 'A')
    expect(useInvitationForm.getState().brideAccounts[1].name).toBe('A')
  })
})
