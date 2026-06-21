import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { invitationPageMachine } from './invitation.machine'

function spawn() {
  return createActor(invitationPageMachine).start()
}

describe('invitationPageMachine — data축', () => {
  it('초기: data loading / tab invitation / rsvp idle', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toMatchObject({ data: 'loading', tab: 'invitation', rsvp: 'idle' })
  })

  it('FETCH_SUCCESS → data ready', () => {
    const a = spawn()
    a.send({ type: 'FETCH_SUCCESS' })
    expect(a.getSnapshot().matches({ data: 'ready' })).toBe(true)
  })

  it('FETCH_ERROR → data error + kind, RETRY_FETCH → loading', () => {
    const a = spawn()
    a.send({ type: 'FETCH_ERROR', kind: 'not_found' })
    expect(a.getSnapshot().matches({ data: 'error' })).toBe(true)
    expect(a.getSnapshot().context.fetchError).toBe('not_found')
    a.send({ type: 'RETRY_FETCH' })
    expect(a.getSnapshot().matches({ data: 'loading' })).toBe(true)
  })
})

describe('invitationPageMachine — tab축', () => {
  it('TAB_CHANGE lounge ↔ invitation + context.activeTab', () => {
    const a = spawn()
    a.send({ type: 'TAB_CHANGE', tab: 'lounge' })
    expect(a.getSnapshot().matches({ tab: 'lounge' })).toBe(true)
    expect(a.getSnapshot().context.activeTab).toBe('lounge')
    a.send({ type: 'TAB_CHANGE', tab: 'invitation' })
    expect(a.getSnapshot().context.activeTab).toBe('invitation')
  })

  it('같은 탭 TAB_CHANGE는 guard로 무시', () => {
    const a = spawn()
    a.send({ type: 'TAB_CHANGE', tab: 'invitation' }) // 이미 invitation
    expect(a.getSnapshot().matches({ tab: 'invitation' })).toBe(true)
  })
})

describe('invitationPageMachine — rsvp축', () => {
  it('RSVP_TIMER_DONE → modalOpen, RSVP_CLOSE → idle', () => {
    const a = spawn()
    a.send({ type: 'RSVP_TIMER_DONE' })
    expect(a.getSnapshot().matches({ rsvp: 'modalOpen' })).toBe(true)
    a.send({ type: 'RSVP_CLOSE' })
    expect(a.getSnapshot().matches({ rsvp: 'idle' })).toBe(true)
  })

  it('RSVP_SUBMIT → submitting → RSVP_SUCCESS → submitted + rsvpSubmitted', () => {
    const a = spawn()
    a.send({ type: 'RSVP_OPEN' })
    a.send({ type: 'RSVP_SUBMIT' })
    expect(a.getSnapshot().matches({ rsvp: 'submitting' })).toBe(true)
    a.send({ type: 'RSVP_SUCCESS' })
    const s = a.getSnapshot()
    expect(s.matches({ rsvp: 'submitted' })).toBe(true)
    expect(s.context.rsvpSubmitted).toBe(true)
  })

  it('RSVP_ERROR → modalOpen 복귀 + rsvpError (재시도 가능)', () => {
    const a = spawn()
    a.send({ type: 'RSVP_OPEN' })
    a.send({ type: 'RSVP_SUBMIT' })
    a.send({ type: 'RSVP_ERROR', error: 'net' })
    const s = a.getSnapshot()
    expect(s.matches({ rsvp: 'modalOpen' })).toBe(true)
    expect(s.context.rsvpError).toBe('net')
  })

  it('제출 완료 후 RSVP_OPEN → duplicate (중복 안내)', () => {
    const a = spawn()
    a.send({ type: 'RSVP_OPEN' })
    a.send({ type: 'RSVP_SUBMIT' })
    a.send({ type: 'RSVP_SUCCESS' }) // submitted
    a.send({ type: 'RSVP_OPEN' }) // submitted → duplicate
    expect(a.getSnapshot().matches({ rsvp: 'duplicate' })).toBe(true)
    a.send({ type: 'RSVP_CLOSE' })
    expect(a.getSnapshot().matches({ rsvp: 'submitted' })).toBe(true)
  })
})
