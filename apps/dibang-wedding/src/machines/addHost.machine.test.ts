import { describe, it, expect } from 'vitest'
import { createActor, fromPromise, waitFor } from 'xstate'
import { addHostMachine } from './addHost.machine'

describe('addHostMachine', () => {
  it('SUBMIT → submitting → done(digest 저장), submit actor는 주입', async () => {
    const m = addHostMachine.provide({
      actors: { submit: fromPromise(async () => 'digest_abc') },
    })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT', newHost: '0xB' })
    const snap = await waitFor(actor, (s) => s.matches('done'))
    expect(snap.context.digest).toBe('digest_abc')
    expect(snap.context.error).toBeNull()
  })

  it('submit 실패 → idle 복귀 + error 기록', async () => {
    const m = addHostMachine.provide({
      actors: {
        submit: fromPromise(async () => {
          throw new Error('boom')
        }),
      },
    })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT', newHost: '0xB' })
    const snap = await waitFor(actor, (s) => s.matches('idle') && s.context.error !== null)
    expect(snap.context.error).toContain('boom')
  })

  it('done → RESET → idle(clear)', async () => {
    const m = addHostMachine.provide({ actors: { submit: fromPromise(async () => 'd') } })
    const actor = createActor(m).start()
    actor.send({ type: 'SUBMIT', newHost: '0xB' })
    await waitFor(actor, (s) => s.matches('done'))
    actor.send({ type: 'RESET' })
    const snap = actor.getSnapshot()
    expect(snap.matches('idle')).toBe(true)
    expect(snap.context.digest).toBeNull()
    expect(snap.context.error).toBeNull()
  })
})
