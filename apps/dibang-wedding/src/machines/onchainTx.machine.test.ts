import { describe, it, expect } from 'vitest'
import { createActor, fromPromise, waitFor } from 'xstate'
import { onchainTxMachine } from './onchainTx.machine'

describe('onchainTxMachine', () => {
  it('SUBMIT → submitting → done(digest), submit actor 주입', async () => {
    const m = onchainTxMachine.provide({ actors: { submit: fromPromise(async () => 'dg') } })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT' })
    const snap = await waitFor(actor, (s) => s.matches('done'))
    expect(snap.context.digest).toBe('dg')
    expect(snap.context.error).toBeNull()
  })

  it('submit 실패 → idle + error', async () => {
    const m = onchainTxMachine.provide({
      actors: { submit: fromPromise(async () => { throw new Error('nope') }) },
    })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT' })
    const snap = await waitFor(actor, (s) => s.matches('idle') && s.context.error !== null)
    expect(snap.context.error).toContain('nope')
  })

  it('done → RESET → idle(clear)', async () => {
    const m = onchainTxMachine.provide({ actors: { submit: fromPromise(async () => 'd') } })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT' })
    await waitFor(actor, (s) => s.matches('done'))
    actor.send({ type: 'RESET' })
    const snap = actor.getSnapshot()
    expect(snap.matches('idle')).toBe(true)
    expect(snap.context.digest).toBeNull()
  })
})
