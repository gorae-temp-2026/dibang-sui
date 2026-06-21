import { describe, it, expect } from 'vitest'
import { createActor } from 'xstate'
import { displayMachine } from './display.machine'

const boot = (weddingId: string | null) =>
  createActor(displayMachine, { input: { weddingId } }).start()

describe('displayMachine', () => {
  it('weddingId 있으면 loadingWedding에서 시작 + context 보존', () => {
    const a = boot('w1')
    expect(a.getSnapshot().value).toBe('loadingWedding')
    expect(a.getSnapshot().context.weddingId).toBe('w1')
    expect(a.getSnapshot().context.channelStatus).toBe('IDLE')
  })

  it('weddingId 없으면 always guard로 즉시 fatalError', () => {
    const a = boot(null)
    expect(a.getSnapshot().value).toBe('fatalError')
    expect(a.getSnapshot().context.fatalReason).toBe('weddingId 없음')
  })

  it('WEDDING_LOADED → subscribing + loungeId 저장', () => {
    const a = boot('w1')
    a.send({ type: 'WEDDING_LOADED', loungeId: 'L1' })
    expect(a.getSnapshot().value).toBe('subscribing')
    expect(a.getSnapshot().context.loungeId).toBe('L1')
  })

  it('subscribing → SUBSCRIBE_OK → ready (channelStatus SUBSCRIBED)', () => {
    const a = boot('w1')
    a.send({ type: 'WEDDING_LOADED', loungeId: 'L1' })
    a.send({ type: 'SUBSCRIBE_OK' })
    expect(a.getSnapshot().value).toBe('ready')
    expect(a.getSnapshot().context.channelStatus).toBe('SUBSCRIBED')
  })

  it('subscribing → SUBSCRIBE_ERROR → reconnecting → RETRY → subscribing', () => {
    const a = boot('w1')
    a.send({ type: 'WEDDING_LOADED', loungeId: 'L1' })
    a.send({ type: 'SUBSCRIBE_ERROR' })
    expect(a.getSnapshot().value).toBe('reconnecting')
    expect(a.getSnapshot().context.channelStatus).toBe('CHANNEL_ERROR')
    a.send({ type: 'RETRY' })
    expect(a.getSnapshot().value).toBe('subscribing')
  })

  it('ready → SUBSCRIBE_TIMEOUT → reconnecting → SUBSCRIBE_OK → ready (자가복구)', () => {
    const a = boot('w1')
    a.send({ type: 'WEDDING_LOADED', loungeId: 'L1' })
    a.send({ type: 'SUBSCRIBE_OK' })
    a.send({ type: 'SUBSCRIBE_TIMEOUT' })
    expect(a.getSnapshot().value).toBe('reconnecting')
    expect(a.getSnapshot().context.channelStatus).toBe('TIMED_OUT')
    a.send({ type: 'SUBSCRIBE_OK' })
    expect(a.getSnapshot().value).toBe('ready')
  })

  it('WEDDING_NOT_FOUND → fatalError (fatalReason 보존)', () => {
    const a = boot('w1')
    a.send({ type: 'WEDDING_NOT_FOUND' })
    expect(a.getSnapshot().value).toBe('fatalError')
    expect(a.getSnapshot().context.fatalReason).toBe('wedding 미존재')
  })

  it('fatalError는 final — 이후 이벤트 무시', () => {
    const a = boot(null)
    a.send({ type: 'WEDDING_LOADED', loungeId: 'L1' })
    expect(a.getSnapshot().value).toBe('fatalError')
  })
})
