import { describe, it, expect } from 'vitest'
import { createActor, fromPromise, waitFor } from 'xstate'
import { moiGateMachine } from './moiGate.machine'

describe('moiGateMachine', () => {
  it('hidden → REQUIRE → visible (Moi 필요 기능 진입·미보유)', () => {
    const actor = createActor(moiGateMachine).start()
    expect(actor.getSnapshot().matches('hidden')).toBe(true)
    actor.send({ type: 'REQUIRE' })
    expect(actor.getSnapshot().matches('visible')).toBe(true)
  })

  it('visible은 강제 — 정의 안 된 닫기 이벤트는 무시되어 못 빠져나간다', () => {
    const actor = createActor(moiGateMachine).start()
    actor.send({ type: 'REQUIRE' })
    actor.send({ type: 'DISMISS' } as never)
    actor.send({ type: 'CLOSE' } as never)
    expect(actor.getSnapshot().matches('visible')).toBe(true)
  })

  it('visible → SUBMIT → submitting → done (createMoi 주입)', async () => {
    const m = moiGateMachine.provide({ actors: { submit: fromPromise(async () => 'dg_moi') } })
    const actor = createActor(m).start()
    actor.send({ type: 'REQUIRE' })
    actor.send({ type: 'SUBMIT' })
    const snap = await waitFor(actor, (s) => s.matches('done'))
    expect(snap.context.digest).toBe('dg_moi')
  })

  it('생성 실패 → visible 복귀 + error (여전히 강제)', async () => {
    const m = moiGateMachine.provide({
      actors: {
        submit: fromPromise<string>(async () => {
          throw new Error('boom')
        }),
      },
    })
    const actor = createActor(m).start()
    actor.send({ type: 'REQUIRE' })
    actor.send({ type: 'SUBMIT' })
    const snap = await waitFor(actor, (s) => s.matches('visible') && s.context.error !== null)
    expect(snap.context.error).toContain('boom')
  })
})
