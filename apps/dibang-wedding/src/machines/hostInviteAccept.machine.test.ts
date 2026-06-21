import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { hostInviteAcceptMachine } from './hostInviteAccept.machine'

describe('hostInviteAcceptMachine', () => {
  it('초기: data loading / accept idle', () => {
    const s = createActor(hostInviteAcceptMachine).start().getSnapshot()
    expect(s.value).toMatchObject({ data: 'loading', accept: 'idle' })
  })

  it('LOAD_DONE → loaded, LOAD_ERROR → error', () => {
    const a = createActor(hostInviteAcceptMachine).start()
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().matches({ data: 'loaded' })).toBe(true)
    const b = createActor(hostInviteAcceptMachine).start()
    b.send({ type: 'LOAD_ERROR' })
    expect(b.getSnapshot().matches({ data: 'error' })).toBe(true)
  })

  it('ACCEPT → accepting → ACCEPT_DONE → idle', () => {
    const a = createActor(hostInviteAcceptMachine).start()
    a.send({ type: 'ACCEPT' })
    expect(a.getSnapshot().matches({ accept: 'accepting' })).toBe(true)
    a.send({ type: 'ACCEPT_DONE' })
    expect(a.getSnapshot().matches({ accept: 'idle' })).toBe(true)
  })

  it('ACCEPT → ACCEPT_ERROR → idle(재시도 가능)', () => {
    const a = createActor(hostInviteAcceptMachine).start()
    a.send({ type: 'ACCEPT' })
    a.send({ type: 'ACCEPT_ERROR' })
    expect(a.getSnapshot().matches({ accept: 'idle' })).toBe(true)
  })

  it('data/accept 독립(parallel)', () => {
    const a = createActor(hostInviteAcceptMachine).start()
    a.send({ type: 'ACCEPT' })
    expect(a.getSnapshot().value).toMatchObject({ data: 'loading', accept: 'accepting' })
  })
})
