/**
 * invitationEdit.machine — parallel(flow / slug). XS-7 재작성.
 * upload 병렬 제거(useInvitationImageUpload가 SSOT), SAVE 가드체인(toast), slug 기본 available.
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

describe('invitationEdit.machine — 초기 & 로딩', () => {
  it('초기: flow loading / slug available(기존 slug 유효)', () => {
    expect(spawn().getSnapshot().value).toEqual({ flow: 'loading', slug: 'available' })
  })

  it('LOAD_SUCCESS → editing + loadError 클리어', () => {
    const a = spawn()
    toEditing(a)
    expect(a.getSnapshot().value).toMatchObject({ flow: 'editing' })
    expect(a.getSnapshot().context.loadError).toBeNull()
  })

  it('LOAD_ERROR(network) → loadError + RETRY_LOAD 재로딩', () => {
    const a = spawn()
    a.send({ type: 'LOAD_ERROR', kind: 'network' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'loadError' })
    expect(a.getSnapshot().context.loadError).toBe('network')
    a.send({ type: 'RETRY_LOAD' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'loading' })
  })

  it('LOAD_ERROR(forbidden) → RETRY_LOAD 가드 실패(loadError 유지)', () => {
    const a = spawn()
    a.send({ type: 'LOAD_ERROR', kind: 'forbidden' })
    a.send({ type: 'RETRY_LOAD' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'loadError' })
  })
})

describe('invitationEdit.machine — 저장 가드 체인', () => {
  it('SAVE(통과) → saving, SAVE_SUCCESS → success + dirty 클리어', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'FIELD_CHANGED' })
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'saving' })
    a.send({ type: 'SAVE_SUCCESS' })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'success' })
    expect(s.context.isDirty).toBe(false)
  })

  it('SAVE(업로드중) → editing 머무름 + toast', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SAVE', missing: [], uploadingNow: true })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'editing' })
    expect(s.context.toast).toBe('사진 업로드가 끝나면 저장할 수 있어요')
  })

  it('SAVE(필수 누락) → editing 머무름 + 누락 toast', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SAVE', missing: ['신랑 이름'], uploadingNow: false })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'editing' })
    expect(s.context.toast).toContain('신랑 이름')
  })

  it('SAVE(slug taken) → editing 머무름 + slug toast', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SLUG_CHECK_START' })
    a.send({ type: 'SLUG_TAKEN' })
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'editing' })
    expect(s.context.toast).toBe('공유 링크 중복 확인이 필요해요')
  })

  it('DISMISS_TOAST → toast 클리어', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SAVE', missing: [], uploadingNow: true })
    a.send({ type: 'DISMISS_TOAST' })
    expect(a.getSnapshot().context.toast).toBeNull()
  })
})

describe('invitationEdit.machine — 충돌 & 에러', () => {
  it('SAVE_CONFLICT → conflict, FORCE_SAVE → saving(충돌 해제)', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    a.send({ type: 'SAVE_CONFLICT' })
    let s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'conflict' })
    expect(s.context.hasConflict).toBe(true)
    a.send({ type: 'FORCE_SAVE' })
    s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'saving' })
    expect(s.context.hasConflict).toBe(false)
  })

  it('conflict → RELOAD_SERVER_DATA → loading + dirty/conflict 클리어', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'FIELD_CHANGED' })
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    a.send({ type: 'SAVE_CONFLICT' })
    a.send({ type: 'RELOAD_SERVER_DATA' })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'loading' })
    expect(s.context.isDirty).toBe(false)
    expect(s.context.hasConflict).toBe(false)
  })

  it('SAVE_ERROR → editing 복귀 + 실패 toast (즉시 재저장 가능, 갇힘 없음)', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    a.send({ type: 'SAVE_ERROR', error: 'net' })
    const s = a.getSnapshot()
    expect(s.value).toMatchObject({ flow: 'editing' })
    expect(s.context.toast).toBe('net')
    // editing이므로 즉시 재저장 가능
    a.send({ type: 'SAVE', missing: [], uploadingNow: false })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'saving' })
  })
})

describe('invitationEdit.machine — 이탈 경고', () => {
  it('dirty → NAVIGATE_AWAY → confirmingLeave → CONFIRM_LEAVE → left', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'FIELD_CHANGED' })
    a.send({ type: 'NAVIGATE_AWAY' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'confirmingLeave' })
    a.send({ type: 'CONFIRM_LEAVE' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'left' })
  })

  it('not dirty → NAVIGATE_AWAY → left 즉시', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'NAVIGATE_AWAY' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'left' })
  })

  it('CANCEL_LEAVE → editing 복귀', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'FIELD_CHANGED' })
    a.send({ type: 'NAVIGATE_AWAY' })
    a.send({ type: 'CANCEL_LEAVE' })
    expect(a.getSnapshot().value).toMatchObject({ flow: 'editing' })
  })
})

describe('invitationEdit.machine — slug 병렬', () => {
  it('SLUG_CHECK_START → checking → SLUG_AVAILABLE → available', () => {
    const a = spawn()
    toEditing(a)
    a.send({ type: 'SLUG_CHECK_START' })
    expect(a.getSnapshot().value).toMatchObject({ slug: 'checking' })
    expect(a.getSnapshot().context.slugStatus).toBe('checking')
    a.send({ type: 'SLUG_AVAILABLE' })
    expect(a.getSnapshot().value).toMatchObject({ slug: 'available' })
    expect(a.getSnapshot().context.slugStatus).toBe('available')
  })
})
