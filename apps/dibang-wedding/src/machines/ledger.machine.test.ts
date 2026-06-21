import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { ledgerMachine } from './ledger.machine'
import type { CashGift } from '@gorae/contracts'

const gift = { id: 'g1' } as unknown as CashGift
const gift2 = { id: 'g2' } as unknown as CashGift

describe('ledgerMachine — tab(전역)', () => {
  it('초기: closed + activeTab ledger', () => {
    const s = createActor(ledgerMachine).start().getSnapshot()
    expect(s.value).toBe('closed')
    expect(s.context.activeTab).toBe('ledger')
  })

  it('TAB_CHANGE는 어느 modal 상태에서나 activeTab 변경', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift }) // detail 상태
    a.send({ type: 'TAB_CHANGE', tab: 'rsvp' })
    expect(a.getSnapshot().value).toBe('detail') // modal 유지
    expect(a.getSnapshot().context.activeTab).toBe('rsvp')
  })
})

describe('ledgerMachine — gift CRUD modal', () => {
  it('OPEN_DETAIL → detail + selectedGift', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    expect(a.getSnapshot().value).toBe('detail')
    expect(a.getSnapshot().context.selectedGift).toBe(gift)
  })

  it('detail → EDIT → editing → SAVED → detail(updated gift)', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    a.send({ type: 'EDIT' })
    expect(a.getSnapshot().value).toBe('editing')
    a.send({ type: 'SAVED', gift: gift2 })
    expect(a.getSnapshot().value).toBe('detail')
    expect(a.getSnapshot().context.selectedGift).toBe(gift2)
  })

  it('editing → CLOSE → detail(편집 취소)', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    a.send({ type: 'EDIT' })
    a.send({ type: 'CLOSE' })
    expect(a.getSnapshot().value).toBe('detail')
  })

  it('detail → DELETE → confirmingDelete + deleteTargetId', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    a.send({ type: 'DELETE' })
    expect(a.getSnapshot().value).toBe('confirmingDelete')
    expect(a.getSnapshot().context.deleteTargetId).toBe('g1')
  })

  it('confirmingDelete → CANCEL_DELETE → detail / CONFIRM_DELETE → closed+clear', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    a.send({ type: 'DELETE' })
    a.send({ type: 'CANCEL_DELETE' })
    expect(a.getSnapshot().value).toBe('detail')
    a.send({ type: 'DELETE' })
    a.send({ type: 'CONFIRM_DELETE' })
    expect(a.getSnapshot().value).toBe('closed')
    expect(a.getSnapshot().context.selectedGift).toBe(null)
    expect(a.getSnapshot().context.deleteTargetId).toBe(null)
  })

  it('OPEN_ADD → adding → CLOSE → closed', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_ADD' })
    expect(a.getSnapshot().value).toBe('adding')
    a.send({ type: 'CLOSE' })
    expect(a.getSnapshot().value).toBe('closed')
  })

  it('detail → CLOSE → closed + clearSelected', () => {
    const a = createActor(ledgerMachine).start()
    a.send({ type: 'OPEN_DETAIL', gift })
    a.send({ type: 'CLOSE' })
    expect(a.getSnapshot().value).toBe('closed')
    expect(a.getSnapshot().context.selectedGift).toBe(null)
  })
})
