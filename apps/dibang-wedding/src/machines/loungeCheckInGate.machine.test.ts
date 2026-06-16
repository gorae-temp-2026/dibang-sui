/**
 * loungeCheckInGate.machine — 5 state (checking/hasEntry/form/submitting/done/error).
 *
 * 책임:
 *  - initial: checking + 빈 context.
 *  - checking → hasEntry on CHECK_SUCCESS + existingEntryId.
 *  - checking → form on CHECK_NOT_FOUND.
 *  - checking → error on CHECK_ERROR + error 세팅.
 *  - form → submitting on SUBMIT.
 *  - submitting → done on SUBMIT_SUCCESS + createdEntryId.
 *  - submitting → form on SUBMIT_ERROR + error 세팅.
 *  - error → checking on RETRY + error 클리어.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { loungeCheckInGateMachine } from './loungeCheckInGate.machine'

function spawn() {
  const actor = createActor(loungeCheckInGateMachine)
  actor.start()
  return actor
}

describe('loungeCheckInGateMachine', () => {
  it('initial: checking + 빈 context', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toBe('checking')
    expect(s.context.existingEntryId).toBeNull()
    expect(s.context.createdEntryId).toBeNull()
    expect(s.context.error).toBeNull()
  })

  it('CHECK_SUCCESS → hasEntry + existingEntryId', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_SUCCESS', entryId: 'e-1' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('hasEntry')
    expect(s.context.existingEntryId).toBe('e-1')
  })

  it('CHECK_NOT_FOUND → form', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_NOT_FOUND' })
    expect(actor.getSnapshot().value).toBe('form')
  })

  it('CHECK_ERROR → error + error 세팅', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_ERROR', error: 'net' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('error')
    expect(s.context.error).toBe('net')
  })

  it('form → submitting on SUBMIT', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_NOT_FOUND' })
    actor.send({ type: 'SUBMIT' })
    expect(actor.getSnapshot().value).toBe('submitting')
  })

  it('submitting → done + createdEntryId', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_NOT_FOUND' })
    actor.send({ type: 'SUBMIT' })
    actor.send({ type: 'SUBMIT_SUCCESS', entryId: 'new-e' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('done')
    expect(s.context.createdEntryId).toBe('new-e')
  })

  it('submitting → form on SUBMIT_ERROR + error 세팅', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_NOT_FOUND' })
    actor.send({ type: 'SUBMIT' })
    actor.send({ type: 'SUBMIT_ERROR', error: 'fail' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('form')
    expect(s.context.error).toBe('fail')
  })

  it('error → checking on RETRY + error 클리어', () => {
    const actor = spawn()
    actor.send({ type: 'CHECK_ERROR', error: 'x' })
    actor.send({ type: 'RETRY' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('checking')
    expect(s.context.error).toBeNull()
  })
})
