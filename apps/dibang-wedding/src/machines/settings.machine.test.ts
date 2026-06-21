import { createActor } from 'xstate'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { settingsMachine } from './settings.machine'

describe('settingsMachine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('초기: save idle / toast hidden', () => {
    expect(createActor(settingsMachine).start().getSnapshot().value).toMatchObject({ save: 'idle', toast: 'hidden' })
  })

  it('SAVE → saving → SAVE_DONE → idle', () => {
    const a = createActor(settingsMachine).start()
    a.send({ type: 'SAVE' })
    expect(a.getSnapshot().matches({ save: 'saving' })).toBe(true)
    a.send({ type: 'SAVE_DONE' })
    expect(a.getSnapshot().matches({ save: 'idle' })).toBe(true)
  })

  it('SHOW_TOAST → visible + msg → 2초 후 자동 hidden', () => {
    const a = createActor(settingsMachine).start()
    a.send({ type: 'SHOW_TOAST', msg: '변경되었습니다' })
    expect(a.getSnapshot().matches({ toast: 'visible' })).toBe(true)
    expect(a.getSnapshot().context.toastMsg).toBe('변경되었습니다')
    vi.advanceTimersByTime(2000)
    expect(a.getSnapshot().matches({ toast: 'hidden' })).toBe(true)
  })

  it('save/toast 독립(parallel)', () => {
    const a = createActor(settingsMachine).start()
    a.send({ type: 'SAVE' })
    a.send({ type: 'SHOW_TOAST', msg: 'x' })
    expect(a.getSnapshot().value).toMatchObject({ save: 'saving', toast: 'visible' })
  })
})
