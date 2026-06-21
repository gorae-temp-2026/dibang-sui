import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { loginMachine } from './login.machine'

describe('loginMachine', () => {
  it('초기: idle', () => {
    expect(createActor(loginMachine).start().getSnapshot().value).toBe('idle')
  })

  it('SIGN_IN_GOOGLE → signingGoogle → SIGN_IN_DONE → idle', () => {
    const a = createActor(loginMachine).start()
    a.send({ type: 'SIGN_IN_GOOGLE' })
    expect(a.getSnapshot().value).toBe('signingGoogle')
    a.send({ type: 'SIGN_IN_DONE' })
    expect(a.getSnapshot().value).toBe('idle')
  })

  it('SIGN_IN_PASSWORD → signingPassword → SIGN_IN_ERROR → idle(재시도 가능)', () => {
    const a = createActor(loginMachine).start()
    a.send({ type: 'SIGN_IN_PASSWORD' })
    expect(a.getSnapshot().value).toBe('signingPassword')
    a.send({ type: 'SIGN_IN_ERROR' })
    expect(a.getSnapshot().value).toBe('idle')
  })

  it('signing 중에는 다른 SIGN_IN 무시(idle에서만 시작)', () => {
    const a = createActor(loginMachine).start()
    a.send({ type: 'SIGN_IN_GOOGLE' })
    a.send({ type: 'SIGN_IN_PASSWORD' }) // signingGoogle에서 무시
    expect(a.getSnapshot().value).toBe('signingGoogle')
  })
})
