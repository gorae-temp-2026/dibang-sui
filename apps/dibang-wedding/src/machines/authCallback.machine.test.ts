import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { authCallbackMachine } from './authCallback.machine'

describe('authCallbackMachine', () => {
  it('초기: processing', () => {
    expect(createActor(authCallbackMachine).start().getSnapshot().value).toBe('processing')
  })

  it('RESOLVE → resolved(세션 도착)', () => {
    const a = createActor(authCallbackMachine).start()
    a.send({ type: 'RESOLVE' })
    expect(a.getSnapshot().value).toBe('resolved')
  })

  it('NO_SESSION → redirectingLogin(코드 없음)', () => {
    const a = createActor(authCallbackMachine).start()
    a.send({ type: 'NO_SESSION' })
    expect(a.getSnapshot().value).toBe('redirectingLogin')
  })

  it('TIMEOUT → timedOut(10초 안전장치)', () => {
    const a = createActor(authCallbackMachine).start()
    a.send({ type: 'TIMEOUT' })
    expect(a.getSnapshot().value).toBe('timedOut')
  })

  it('final 상태 도달 후 추가 이벤트 무시', () => {
    const a = createActor(authCallbackMachine).start()
    a.send({ type: 'RESOLVE' })
    a.send({ type: 'TIMEOUT' })
    expect(a.getSnapshot().value).toBe('resolved')
  })
})
