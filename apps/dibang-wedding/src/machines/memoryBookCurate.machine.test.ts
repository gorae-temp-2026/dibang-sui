import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { memoryBookCurateMachine } from './memoryBookCurate.machine'

describe('memoryBookCurateMachine — data축', () => {
  it('초기: data loading / save idle / lightbox closed', () => {
    const s = createActor(memoryBookCurateMachine).start().getSnapshot()
    expect(s.value).toMatchObject({ data: 'loading', save: 'idle', lightbox: 'closed' })
  })

  it('LOAD_DONE → loaded, LOAD_ERROR → error', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().matches({ data: 'loaded' })).toBe(true)
    const b = createActor(memoryBookCurateMachine).start()
    b.send({ type: 'LOAD_ERROR' })
    expect(b.getSnapshot().matches({ data: 'error' })).toBe(true)
  })
})

describe('memoryBookCurateMachine — save축', () => {
  it('SAVE → saving → SAVE_SUCCESS → success', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'SAVE' })
    expect(a.getSnapshot().matches({ save: 'saving' })).toBe(true)
    a.send({ type: 'SAVE_SUCCESS' })
    expect(a.getSnapshot().matches({ save: 'success' })).toBe(true)
  })

  it('SAVE → SAVE_ERROR → error + saveError context', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'SAVE' })
    a.send({ type: 'SAVE_ERROR', error: 'invalid_ids' })
    expect(a.getSnapshot().matches({ save: 'error' })).toBe(true)
    expect(a.getSnapshot().context.saveError).toBe('invalid_ids')
  })

  it('SAVE_EMPTY → confirmingEmpty → CANCEL_EMPTY → idle / CONFIRM_EMPTY → saving', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'SAVE_EMPTY' })
    expect(a.getSnapshot().matches({ save: 'confirmingEmpty' })).toBe(true)
    a.send({ type: 'CANCEL_EMPTY' })
    expect(a.getSnapshot().matches({ save: 'idle' })).toBe(true)
    a.send({ type: 'SAVE_EMPTY' })
    a.send({ type: 'CONFIRM_EMPTY' })
    expect(a.getSnapshot().matches({ save: 'saving' })).toBe(true)
  })

  it('error → RESET_TOAST → idle + saveError clear', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'SAVE' })
    a.send({ type: 'SAVE_ERROR', error: 'x' })
    a.send({ type: 'RESET_TOAST' })
    expect(a.getSnapshot().matches({ save: 'idle' })).toBe(true)
    expect(a.getSnapshot().context.saveError).toBe(null)
  })
})

describe('memoryBookCurateMachine — lightbox축', () => {
  it('OPEN_LIGHTBOX → open + index, CHANGE → index, CLOSE → closed+null', () => {
    const a = createActor(memoryBookCurateMachine).start()
    a.send({ type: 'OPEN_LIGHTBOX', index: 3 })
    expect(a.getSnapshot().matches({ lightbox: 'open' })).toBe(true)
    expect(a.getSnapshot().context.lightboxIndex).toBe(3)
    a.send({ type: 'CHANGE_LIGHTBOX', index: 5 })
    expect(a.getSnapshot().context.lightboxIndex).toBe(5)
    a.send({ type: 'CLOSE_LIGHTBOX' })
    expect(a.getSnapshot().matches({ lightbox: 'closed' })).toBe(true)
    expect(a.getSnapshot().context.lightboxIndex).toBe(null)
  })
})
