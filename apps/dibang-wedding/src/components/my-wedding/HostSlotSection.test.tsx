import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { WeddingSummary, HostInvite } from '@gorae/contracts'
import { HostSlotSection } from './HostSlotSection'

const wedding = {
  id: 'w1',
  status: 'active',
  groom_name: '박태원',
  bride_name: '박소율',
  groom_father_name: '신랑부',
  groom_mother_name: '신랑모',
  bride_father_name: '신부부',
  bride_mother_name: '신부모',
  date: '2026-06-03',
  invitations: [],
} as unknown as WeddingSummary

function baseProps() {
  return {
    wedding,
    isCreating: false,
    onCreate: vi.fn(),
    onCancel: vi.fn(),
    onCopyInviteLink: vi.fn(),
    onShareInvite: vi.fn(),
  }
}

const pendingInvite = (slot: string) =>
  ({ id: `inv-${slot}`, slot, status: 'pending', token: `tok-${slot}` }) as unknown as HostInvite

describe('HostSlotSection — 점유 기반 슬롯 렌더', () => {
  it('배우자 슬롯이 점유돼 있으면(초대 없이 채워진 생성자 포함) 이름을 표시하고 초대 버튼을 띄우지 않는다', () => {
    // 신부 시점: 배우자=신랑. 신랑은 생성자로 host_groom_id가 차 있으나 invite는 없음.
    render(
      <HostSlotSection
        {...baseProps()}
        myRole="bride"
        invites={[]}
        occupiedSlots={new Set(['groom'])}
      />,
    )
    // 신랑 슬롯이 "채워짐"으로 이름 표시.
    expect(screen.getByText('박태원')).toBeInTheDocument()
    // 점유된 신랑 슬롯엔 '초대하기'가 없어야 함 → 빈 부모 슬롯 4개만 초대 버튼.
    expect(screen.getAllByRole('button', { name: 'Invite' })).toHaveLength(4)
  })

  it('점유 없고 pending 초대가 있으면 대기중 + 공유/취소를 노출한다', () => {
    render(
      <HostSlotSection
        {...baseProps()}
        myRole="bride"
        invites={[pendingInvite('groom')]}
        occupiedSlots={new Set()}
      />,
    )
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Share on KakaoTalk')).toBeInTheDocument()
  })

  it('점유도 초대도 없으면 초대하기 버튼을 띄운다(배우자+부모 4 = 5개)', () => {
    render(
      <HostSlotSection
        {...baseProps()}
        myRole="bride"
        invites={[]}
        occupiedSlots={new Set()}
      />,
    )
    expect(screen.getAllByRole('button', { name: 'Invite' })).toHaveLength(5)
  })
})
