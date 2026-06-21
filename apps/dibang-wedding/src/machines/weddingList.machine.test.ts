import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { weddingListMachine } from './weddingList.machine'

describe('weddingListMachine', () => {
  it('초기: loading', () => {
    expect(createActor(weddingListMachine).start().getSnapshot().value).toBe('loading')
  })

  it('LOAD_DONE → loaded', () => {
    const a = createActor(weddingListMachine).start()
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().value).toBe('loaded')
  })

  it('loaded에서 LOAD_DONE 재전송은 무해(loaded 유지)', () => {
    const a = createActor(weddingListMachine).start()
    a.send({ type: 'LOAD_DONE' })
    a.send({ type: 'LOAD_DONE' })
    expect(a.getSnapshot().value).toBe('loaded')
  })
})
