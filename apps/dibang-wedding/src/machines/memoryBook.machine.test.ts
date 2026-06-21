import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { memoryBookMachine } from './memoryBook.machine'

describe('memoryBookMachine', () => {
  it('초기: loading', () => {
    expect(createActor(memoryBookMachine).start().getSnapshot().value).toBe('loading')
  })

  it('LOAD_SUCCESS → loaded', () => {
    const a = createActor(memoryBookMachine).start()
    a.send({ type: 'LOAD_SUCCESS' })
    expect(a.getSnapshot().value).toBe('loaded')
  })

  it('LOAD_ERROR → error, RETRY → loading', () => {
    const a = createActor(memoryBookMachine).start()
    a.send({ type: 'LOAD_ERROR' })
    expect(a.getSnapshot().value).toBe('error')
    a.send({ type: 'RETRY' })
    expect(a.getSnapshot().value).toBe('loading')
  })
})
