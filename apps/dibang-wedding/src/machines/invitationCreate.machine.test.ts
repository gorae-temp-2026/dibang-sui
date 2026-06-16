/**
 * invitationCreate.machine — parallel machine (flow / slug / upload).
 *
 * invoke 없음(전부 send 기반). createActor로 region별 검증.
 * parallel이므로 getSnapshot().value = { flow, slug, upload }.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { invitationCreateMachine } from './invitationCreate.machine'

function spawn() {
  const actor = createActor(invitationCreateMachine)
  actor.start()
  return actor
}

describe('invitationCreate.machine — initial', () => {
  it('parallel 초기: flow editing / slug idle / upload idle', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toEqual({ flow: 'editing', slug: 'idle', upload: 'idle' })
    expect(s.context.slugStatus).toBe('idle')
    expect(s.context.uploadsInProgress).toBe(0)
    expect(s.context.isDirty).toBe(false)
  })
})

describe('invitationCreate.machine — flow region', () => {
  it('FIELD_CHANGED → isDirty true', () => {
    const actor = spawn()
    actor.send({ type: 'FIELD_CHANGED' })
    expect(actor.getSnapshot().context.isDirty).toBe(true)
  })

  it('SAVE + slug 미available → validating 거쳐 editing 복귀', () => {
    const actor = spawn()
    actor.send({ type: 'SAVE' })
    // validating의 always: 검증에러 없음 + slug not available → editing
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'editing' })
  })

  it('slug available 후 SAVE → saving (saveAttempts++)', () => {
    const actor = spawn()
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    expect(actor.getSnapshot().context.slugStatus).toBe('available')
    actor.send({ type: 'SAVE' })
    const s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'saving' })
    expect(s.context.saveAttempts).toBe(1)
  })

  it('saving → success on SAVE_SUCCESS', () => {
    const actor = spawn()
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    actor.send({ type: 'SAVE_SUCCESS' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'success' })
  })

  it('saving → saveError on SAVE_ERROR + 메시지 보존, RETRY로 재시도', () => {
    const actor = spawn()
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_AVAILABLE' })
    actor.send({ type: 'SAVE' })
    actor.send({ type: 'SAVE_ERROR', error: 'boom' })
    let s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'saveError' })
    expect(s.context.saveError).toBe('boom')
    actor.send({ type: 'RETRY' })
    s = actor.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'saving' })
    expect(s.context.saveAttempts).toBe(2)
  })

  it('dirty 상태에서 NAVIGATE_AWAY → confirmingLeave, CANCEL_LEAVE → editing', () => {
    const actor = spawn()
    actor.send({ type: 'FIELD_CHANGED' })
    actor.send({ type: 'NAVIGATE_AWAY' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'confirmingLeave' })
    actor.send({ type: 'CANCEL_LEAVE' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'editing' })
  })

  it('not dirty에서 NAVIGATE_AWAY → left (즉시 이탈)', () => {
    const actor = spawn()
    actor.send({ type: 'NAVIGATE_AWAY' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'left' })
  })

  it('업로드 중이면 SAVE 무시(editing 유지)', () => {
    const actor = spawn()
    actor.send({ type: 'UPLOAD_START' })
    actor.send({ type: 'SAVE' })
    expect(actor.getSnapshot().value).toMatchObject({ flow: 'editing' })
  })
})

describe('invitationCreate.machine — slug region', () => {
  it('SLUG_CHECK_START → checking → SLUG_TAKEN → taken (context 갱신)', () => {
    const actor = spawn()
    actor.send({ type: 'SLUG_CHECK_START' })
    expect(actor.getSnapshot().value).toMatchObject({ slug: 'checking' })
    actor.send({ type: 'SLUG_TAKEN' })
    const s = actor.getSnapshot()
    expect(s.value).toMatchObject({ slug: 'taken' })
    expect(s.context.slugStatus).toBe('taken')
  })

  it('SLUG_ERROR → error', () => {
    const actor = spawn()
    actor.send({ type: 'SLUG_CHECK_START' })
    actor.send({ type: 'SLUG_ERROR' })
    expect(actor.getSnapshot().context.slugStatus).toBe('error')
  })
})

describe('invitationCreate.machine — upload region', () => {
  it('UPLOAD_START 2회 → uploadsInProgress 2', () => {
    const actor = spawn()
    actor.send({ type: 'UPLOAD_START' })
    actor.send({ type: 'UPLOAD_START' })
    const s = actor.getSnapshot()
    expect(s.value).toMatchObject({ upload: 'uploading' })
    expect(s.context.uploadsInProgress).toBe(2)
  })

  it('UPLOAD_SUCCESS 2회로 0 도달 → idle 복귀', () => {
    const actor = spawn()
    actor.send({ type: 'UPLOAD_START' })
    actor.send({ type: 'UPLOAD_START' })
    actor.send({ type: 'UPLOAD_SUCCESS' })
    expect(actor.getSnapshot().context.uploadsInProgress).toBe(1)
    actor.send({ type: 'UPLOAD_SUCCESS' })
    const s = actor.getSnapshot()
    expect(s.context.uploadsInProgress).toBe(0)
    expect(s.value).toMatchObject({ upload: 'idle' })
  })

  it('UPLOAD_ERROR도 카운트 감소 + 마지막이면 idle', () => {
    const actor = spawn()
    actor.send({ type: 'UPLOAD_START' })
    actor.send({ type: 'UPLOAD_ERROR', error: 'x' })
    expect(actor.getSnapshot().value).toMatchObject({ upload: 'idle' })
    expect(actor.getSnapshot().context.uploadsInProgress).toBe(0)
  })
})
