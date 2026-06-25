import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { networkMachine } from './network.machine'

describe('networkMachine', () => {
  it('초기: moi idle / ium idle', () => {
    expect(createActor(networkMachine).start().getSnapshot().value).toMatchObject({ moi: 'idle', ium: 'idle' })
  })

  it('CREATE_MOI → submitting + pending, MOI_DONE → idle + result', () => {
    const a = createActor(networkMachine).start()
    a.send({ type: 'CREATE_MOI' })
    expect(a.getSnapshot().matches({ moi: 'submitting' })).toBe(true)
    expect(a.getSnapshot().context.moiResult).toBe('Issuing Moi...')
    a.send({ type: 'MOI_DONE', result: '✅ digest abc' })
    expect(a.getSnapshot().matches({ moi: 'idle' })).toBe(true)
    expect(a.getSnapshot().context.moiResult).toBe('✅ digest abc')
  })

  it('MOI_ERROR → idle + 에러 result', () => {
    const a = createActor(networkMachine).start()
    a.send({ type: 'CREATE_MOI' })
    a.send({ type: 'MOI_ERROR', result: '❌ fail' })
    expect(a.getSnapshot().matches({ moi: 'idle' })).toBe(true)
    expect(a.getSnapshot().context.moiResult).toBe('❌ fail')
  })

  it('CREATE_IUM → submitting, IUM_DONE → idle + result', () => {
    const a = createActor(networkMachine).start()
    a.send({ type: 'CREATE_IUM' })
    expect(a.getSnapshot().matches({ ium: 'submitting' })).toBe(true)
    a.send({ type: 'IUM_DONE', result: '✅ ium' })
    expect(a.getSnapshot().context.iumResult).toBe('✅ ium')
  })

  it('moi/ium 독립(parallel) — 동시 submitting', () => {
    const a = createActor(networkMachine).start()
    a.send({ type: 'CREATE_MOI' })
    a.send({ type: 'CREATE_IUM' })
    expect(a.getSnapshot().value).toMatchObject({ moi: 'submitting', ium: 'submitting' })
  })
})
