/**
 * loungeFeed.machine — 4 state lifecycle.
 *
 * 책임:
 *  - initial: loading. context errorMessage=null, refreshAttempts=0.
 *  - loading → idle on LOAD_SUCCESS, errorMessage 클리어.
 *  - loading → error on LOAD_ERROR, errorMessage 세팅.
 *  - idle → refreshing on REFRESH, refreshAttempts++.
 *  - refreshing → idle on REFRESH_SUCCESS, errorMessage 클리어 + refreshAttempts=0.
 *  - refreshing → idle on REFRESH_ERROR, errorMessage 세팅(증가는 유지).
 *  - error → loading on RETRY, errorMessage 클리어.
 *
 * 컨벤션: TESTING.md § 매트릭스 — xState v5 createActor 패턴.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { loungeFeedMachine } from './loungeFeed.machine'

function spawn() {
  const actor = createActor(loungeFeedMachine)
  actor.start()
  return actor
}

describe('loungeFeedMachine', () => {
  it('initial: loading + 빈 context', () => {
    const actor = spawn()
    const s = actor.getSnapshot()
    expect(s.value).toBe('loading')
    expect(s.context.errorMessage).toBeNull()
    expect(s.context.refreshAttempts).toBe(0)
  })

  it('loading → idle on LOAD_SUCCESS', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  it('loading → error on LOAD_ERROR + errorMessage 세팅', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', error: 'oops' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('error')
    expect(s.context.errorMessage).toBe('oops')
  })

  it('idle → refreshing on REFRESH, attempts++', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('refreshing')
    expect(s.context.refreshAttempts).toBe(1)
  })

  it('refreshing → idle on REFRESH_SUCCESS, errorMessage 클리어 + attempts=0', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    expect(actor.getSnapshot().context.refreshAttempts).toBe(1)
    actor.send({ type: 'REFRESH_SUCCESS' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('idle')
    expect(s.context.errorMessage).toBeNull()
    expect(s.context.refreshAttempts).toBe(0)
  })

  it('refreshing → idle on REFRESH_ERROR + errorMessage 세팅 (attempts 유지)', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_SUCCESS' })
    actor.send({ type: 'REFRESH' })
    actor.send({ type: 'REFRESH_ERROR', error: 'net' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('idle')
    expect(s.context.errorMessage).toBe('net')
    expect(s.context.refreshAttempts).toBe(1)
  })

  it('error → loading on RETRY, errorMessage 클리어', () => {
    const actor = spawn()
    actor.send({ type: 'LOAD_ERROR', error: 'x' })
    actor.send({ type: 'RETRY' })
    const s = actor.getSnapshot()
    expect(s.value).toBe('loading')
    expect(s.context.errorMessage).toBeNull()
  })
})
