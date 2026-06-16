/**
 * onboardingConsent.machine — 4 약관 체크 + 제출 흐름.
 *
 * 책임:
 *  - initial: editing + 모두 false + error null.
 *  - TOGGLE: 단일 키 반전.
 *  - TOGGLE_ALL: 4개 동시 세팅.
 *  - SUBMIT 가드(canSubmit): age_verification + service + privacy 셋 다 true여야 진입.
 *  - submitting → success on SUBMIT_SUCCESS (final state).
 *  - submitting → editing on SUBMIT_ERROR + error 세팅.
 *  - isRequiredAllChecked 헬퍼 단독 검증.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { onboardingConsentMachine, isRequiredAllChecked } from './onboardingConsent.machine'

function spawn() {
  const actor = createActor(onboardingConsentMachine)
  actor.start()
  return actor
}

describe('onboardingConsentMachine', () => {
  it('initial: editing + 모두 false + error null', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.age_verification).toBe(false)
    expect(s.context.service).toBe(false)
    expect(s.context.privacy).toBe(false)
    expect(s.context.marketing).toBe(false)
    expect(s.context.error).toBeNull()
  })

  it('TOGGLE: 단일 키 반전', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE', key: 'service' })
    expect(actor.getSnapshot().context.service).toBe(true)
    actor.send({ type: 'TOGGLE', key: 'service' })
    expect(actor.getSnapshot().context.service).toBe(false)
  })

  it('TOGGLE_ALL: 4개 동시 세팅', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE_ALL', value: true })
    const c = actor.getSnapshot().context
    expect(c.age_verification && c.service && c.privacy && c.marketing).toBe(true)
    actor.send({ type: 'TOGGLE_ALL', value: false })
    const c2 = actor.getSnapshot().context
    expect(c2.age_verification || c2.service || c2.privacy || c2.marketing).toBe(false)
  })

  it('SUBMIT 가드: required 셋 다 true 아니면 무시 (editing 유지)', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE', key: 'age_verification' })
    actor.send({ type: 'TOGGLE', key: 'service' })
    // privacy 빠짐 → SUBMIT 가드 실패
    actor.send({ type: 'SUBMIT' })
    expect(actor.getSnapshot().value).toBe('editing')
  })

  it('SUBMIT 가드 통과 → submitting (필수 3개 체크, marketing 무관)', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE', key: 'age_verification' })
    actor.send({ type: 'TOGGLE', key: 'service' })
    actor.send({ type: 'TOGGLE', key: 'privacy' })
    actor.send({ type: 'SUBMIT' })
    expect(actor.getSnapshot().value).toBe('submitting')
  })

  it('submitting → success on SUBMIT_SUCCESS (final state)', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE_ALL', value: true })
    actor.send({ type: 'SUBMIT' })
    actor.send({ type: 'SUBMIT_SUCCESS' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('success')
    expect(s.status).toBe('done') // xState v5: final state → status done
  })

  it('submitting → editing on SUBMIT_ERROR + error 세팅', () => {
    const actor = spawn()
    actor.send({ type: 'TOGGLE_ALL', value: true })
    actor.send({ type: 'SUBMIT' })
    actor.send({ type: 'SUBMIT_ERROR', error: 'network' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.error).toBe('network')
  })

  it('isRequiredAllChecked 헬퍼: 필수 3개 모두 true → true', () => {
    expect(
      isRequiredAllChecked({
        age_verification: true, service: true, privacy: true, marketing: false,
        nextUrl: '', error: null,
      }),
    ).toBe(true)
    expect(
      isRequiredAllChecked({
        age_verification: true, service: true, privacy: false, marketing: true,
        nextUrl: '', error: null,
      }),
    ).toBe(false)
  })
})
