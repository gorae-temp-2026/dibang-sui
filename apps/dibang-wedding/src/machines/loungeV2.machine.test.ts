/**
 * loungeV2.machine — loungeFeed와 구조 동일(loading→idle→refreshing/error).
 *
 * V1 머신과 분리된 별도 검증으로 V2 변경 시 안전망 확보.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { loungeV2Machine } from './loungeV2.machine'

function spawn() {
  const actor = createActor(loungeV2Machine)
  actor.start()
  return actor
}

describe('loungeV2Machine', () => {
  it('initial: loading + 빈 context', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toBe('loading')
    expect(s.context.errorMessage).toBeNull()
    expect(s.context.refreshAttempts).toBe(0)
  })

  it('LOAD_SUCCESS: loading → idle', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  it('LOAD_ERROR: loading → error + errorMessage', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', error: 'oops' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('error')
    expect(s.context.errorMessage).toBe('oops')
  })

  it('REFRESH → refreshing, attempts++', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    expect(actor.getSnapshot().context.refreshAttempts).toBe(1)
  })

  it('REFRESH_SUCCESS → idle + 청소(attempts=0)', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    actor.send({ type: 'REFRESH_SUCCESS' })
    expect(actor.getSnapshot().context.refreshAttempts).toBe(0)
  })

  it('REFRESH_ERROR → idle + errorMessage(attempts 유지)', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    actor.send({ type: 'REFRESH_ERROR', error: 'net' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('idle')
    expect(s.context.errorMessage).toBe('net')
    expect(s.context.refreshAttempts).toBe(1)
  })

  it('RETRY: error → loading', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', error: 'x' })
    actor.send({ type: 'RETRY' })
    expect(actor.getSnapshot().value).toBe('loading')
  })
})
