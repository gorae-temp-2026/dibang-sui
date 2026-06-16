/**
 * invitationEdit.machine — parallel machine (flow / slug / upload).
 *
 * invitationCreate와 유사하나 flow에 loading·loadError·conflict 추가.
 * invoke 없음.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { invitationEditMachine } from './invitationEdit.machine'

function spawn() {
  const actor = createActor(invitationEditMachine)
  actor.start()
  return actor
}

function toEditing(actor: ReturnType<typeof spawn>) {
  actor.send({ type: 'LOAD_SUCCESS' })
}

describe('invitationEdit.machine — initial & loading', () => {
  it('초기: flow loading / slug idle / upload idle', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toEqual({ flow: 'loading', slug: 'idle', upload: 'idle' })
  })

  it('LOAD_SUCCESS → editing + loadError 클리어', () => {
    const actor = spawn()
    toEditing(actor)
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'editing' })
    expect(actor.getSnapshot().context.loadError).toBeNull()
  })

  it('LOAD_ERROR(network) → loadError + RETRY_LOAD로 재로딩(가드 통과)', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', kind: 'network' })
    let s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'loadError' })
    expect(s.context.loadError).toBe('network')
    actor.send({ type: 'RETRY_LOAD' })
    s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'loading' })
  })

  it('LOAD_ERROR(forbidden) → RETRY_LOAD 가드 실패(loadError 유지)', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', kind: 'forbidden' })
    actor.send({ type: 'RETRY_LOAD' })
    // isNetworkError 가드 실패 → loadError 유지
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'loadError' })
  })
})

describe('invitationEdit.machine — save flow', () => {
  it('slug available 후 SAVE → saving, SAVE_SUCCESS → success + dirty 클리어', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'FIELD_CHANGED' })
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'saving' })
    actor.send({ type: 'SAVE_SUCCESS' })
    const s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'success' })
    expect(s.context.isDirty).toBe(false)
  })

  it('SAVE_CONFLICT → conflict, FORCE_SAVE → saving(충돌 해제)', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    actor.send({ type: 'SAVE_CONFLICT' })
    let s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'conflict' })
    expect(s.context.hasConflict).toBe(true)
    actor.send({ type: 'FORCE_SAVE' })
    s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'saving' })
    expect(s.context.hasConflict).toBe(false)
  })

  it('conflict → RELOAD_SERVER_DATA → loading + dirty/conflict 클리어', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'FIELD_CHANGED' })
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    actor.send({ type: 'SAVE_CONFLICT' })
    actor.send({ type: 'RELOAD_SERVER_DATA' })
    const s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'loading' })
    expect(s.context.isDirty).toBe(false)
    expect(s.context.hasConflict).toBe(false)
  })

  it('SAVE_ERROR → saveError + RETRY로 재시도', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    actor.send({ type: 'SAVE_ERROR', error: 'net' })
    expect(actor.getSnapshot().context.saveError).toBe('net')
    actor.send({ type: 'RETRY' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'saving' })
  })
})

describe('invitationEdit.machine — leave guard', () => {
  it('dirty → NAVIGATE_AWAY → confirmingLeave → CONFIRM_LEAVE → left', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'FIELD_CHANGED' })
    actor.send({ type: 'NAVIGATE_AWAY' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'confirmingLeave' })
    actor.send({ type: 'CONFIRM_LEAVE' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'left' })
  })

  it('not dirty → NAVIGATE_AWAY → left 즉시', () => {
    const actor = spawn()
    toEditing(actor)
    actor.send({ type: 'NAVIGATE_AWAY' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'left' })
  })
})

describe('invitationEdit.machine — upload region', () => {
  it('UPLOAD_START/SUCCESS 카운트 + idle 복귀', () => {
    const actor = spawn()
    actor.send({ type: 'UPLOAD_START' })
    expect(actor.getSnapshot().context.uploadsInProgress).toBe(1)
    actor.send({ type: 'UPLOAD_SUCCESS' })
    expect(actor.getSnapshot().value).toMatchObject({ upload: 'idle' })
    expect(actor.getSnapshot().context.uploadsInProgress).toBe(0)
  })
})
