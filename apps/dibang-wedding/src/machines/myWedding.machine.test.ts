import { createActor } from 'xstate'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { myWeddingMachine } from './myWedding.machine'

describe('myWeddingMachine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('초기: data loading / toast hidden', () => {
    const a = createActor(myWeddingMachine).start()
    expect(a.getSnapshot().value).toMatchObject({ data: 'loading', toast: 'hidden' })
  })

  it('LOAD_DONE → data loaded', () => {
    const a = createActor(myWeddingMachine).start()
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().matches({ data: 'loaded' })).toBe(true)
  })

  it('COPY_DONE → toast visible → 2초 후 자동 hidden', () => {
    const a = createActor(myWeddingMachine).start()
    a.send({ type: 'COPY_DONE' })
    expect(a.getSnapshot().matches({ toast: 'visible' })).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(a.getSnapshot().matches({ toast: 'hidden' })).toBe(true)
  })

  it('재복사 시 타이머 리셋(visible 유지 후 리셋 기준 2초)', () => {
    const a = createActor(myWeddingMachine).start()
    a.send({ type: 'COPY_DONE' })
    vi.advanceTimersByTime(1500)
    a.send({ type: 'COPY_DONE' }) // 타이머 리셋(self transition)
    vi.advanceTimersByTime(1000) // 리셋 후 1s — 아직 visible
    expect(a.getSnapshot().matches({ toast: 'visible' })).toBe(true)
    vi.advanceTimersByTime(1000) // 리셋 후 2s — hidden
    expect(a.getSnapshot().matches({ toast: 'hidden' })).toBe(true)
  })

  it('data축과 toast축은 독립(parallel)', () => {
    const a = createActor(myWeddingMachine).start()
    a.send({ type: 'COPY_DONE' }) // toast visible, data 여전 loading
    expect(a.getSnapshot().value).toMatchObject({ data: 'loading', toast: 'visible' })
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().value).toMatchObject({ data: 'loaded', toast: 'visible' })
  })
})
