/**
 * invitationCreate.machine — 단일 region flow (slugGate → editing → saving → success/left).
 *
 * invoke 없음(전부 send 기반). 실제 페이지(InvitationCreatePage.tsx) 흐름과 1:1.
 * 업로드/slug 가용성/폼 검증은 머신 밖(훅·store)에서 계산해 SAVE 이벤트 페이로드로 전달.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { invitationCreateMachine } from './invitationCreate.machine'

function spawn() {
  const actor = createActor(invitationCreateMachine)
  actor.start()
  return actor
}

const VALID_CREATE = { type: 'SAVE', uploadingNow: false, isAddMode: false, slug: 'abcd', missing: null } as const
const VALID_ADD = { type: 'SAVE', uploadingNow: false, isAddMode: true, slug: 'abcd', missing: null } as const

describe('invitationCreate.machine — initial', () => {
  it('slugGate에서 시작, context 비어있음', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toBe('slugGate')
    expect(s.context.toast).toBeNull()
    expect(s.context.saveError).toBeNull()
  })
})

describe('invitationCreate.machine — slugGate', () => {
  it('CONFIRM_SLUG → editing', () => {
    const actor = spawn()
    actor.send({ type: 'CONFIRM_SLUG' })
    expect(actor.getSnapshot().value).toBe('editing')
  })

  it('CLOSE → left (final)', () => {
    const actor = spawn()
    actor.send({ type: 'CLOSE' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('left')
    expect(s.status).toBe('done')
  })

  it('slugGate에서는 SAVE 무시(전이 없음)', () => {
    const actor = spawn()
    actor.send(VALID_CREATE)
    expect(actor.getSnapshot().value).toBe('slugGate')
  })
})

describe('invitationCreate.machine — editing SAVE 가드', () => {
  function editing() {
    const actor = spawn()
    actor.send({ type: 'CONFIRM_SLUG' })
    return actor
  }

  it('업로드 진행 중 → editing 유지 + 토스트', () => {
    const actor = editing()
    actor.send({ type: 'SAVE', uploadingNow: true, isAddMode: false, slug: 'abcd', missing: null })
    const s = actor.getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.toast).toBe('사진 업로드가 끝나면 저장할 수 있어요')
  })

  it('추가 모드 + slug 2자 미만 → editing 유지 + 토스트', () => {
    const actor = editing()
    actor.send({ type: 'SAVE', uploadingNow: false, isAddMode: true, slug: 'a', missing: null })
    const s = actor.getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.toast).toBe('공유 링크를 입력해주세요')
  })

  it('생성 모드 + 필수 누락 → editing 유지 + 누락 토스트', () => {
    const actor = editing()
    actor.send({ type: 'SAVE', uploadingNow: false, isAddMode: false, slug: 'abcd', missing: '신랑 이름' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.toast).toBe('신랑 이름을(를) 입력해주세요')
  })

  it('생성 모드 + 검증 통과 → saving (토스트 클리어)', () => {
    const actor = editing()
    actor.send({ type: 'SAVE', uploadingNow: false, isAddMode: false, slug: 'abcd', missing: '신랑 이름' }) // 토스트 설정
    actor.send(VALID_CREATE) // 통과
    const s = actor.getSnapshot()
    expect(s.value).toBe('saving')
    expect(s.context.toast).toBeNull()
  })

  it('추가 모드 + slug 유효 → saving', () => {
    const actor = editing()
    actor.send(VALID_ADD)
    expect(actor.getSnapshot().value).toBe('saving')
  })

  it('DISMISS_TOAST → 토스트 클리어', () => {
    const actor = editing()
    actor.send({ type: 'SAVE', uploadingNow: true, isAddMode: false, slug: 'abcd', missing: null })
    expect(actor.getSnapshot().context.toast).not.toBeNull()
    actor.send({ type: 'DISMISS_TOAST' })
    expect(actor.getSnapshot().context.toast).toBeNull()
  })
})

describe('invitationCreate.machine — saving', () => {
  function saving() {
    const actor = spawn()
    actor.send({ type: 'CONFIRM_SLUG' })
    actor.send(VALID_CREATE)
    return actor
  }

  it('SAVE_SUCCESS → success (final)', () => {
    const actor = saving()
    actor.send({ type: 'SAVE_SUCCESS' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('success')
    expect(s.status).toBe('done')
  })

  it('SAVE_ERROR → editing + saveError 보존', () => {
    const actor = saving()
    actor.send({ type: 'SAVE_ERROR', error: 'boom' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('editing')
    expect(s.context.saveError).toBe('boom')
  })

  it('재저장 시 saving 진입은 saveError를 클리어', () => {
    const actor = saving()
    actor.send({ type: 'SAVE_ERROR', error: 'boom' })
    actor.send(VALID_CREATE)
    const s = actor.getSnapshot()
    expect(s.value).toBe('saving')
    expect(s.context.saveError).toBeNull()
  })
})
