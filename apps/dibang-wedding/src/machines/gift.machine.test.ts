/**
 * 선물(증여) 거래 머신 단위 테스트.
 *  - 전송 = 요네 차감(1회) + 로그(fromMe) + 신뢰 신호 적립(증여자→수령자).
 *  - 수신 = 인벤토리 + 로그(fromMe=false). 요네 부족 시 guard 차단. 신호는 상대별 누적.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, type Actor } from 'xstate'
import { giftMachine } from './gift.machine'
import { SHOP } from '../components/moi-gather/data'

const price = (id: string) => SHOP.find((s) => s.id === id)!.yone

async function send(a: Actor<typeof giftMachine>, itemId: string, toId: string, toName: string) {
  a.send({ type: 'SEND_GIFT', itemId, toId, toName })
  await vi.advanceTimersByTimeAsync(600)
}

describe('gift 머신 (선물 거래)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('전송 → 요네 차감 + 로그(fromMe) + 신뢰 신호 적립', async () => {
    const a = createActor(giftMachine).start()
    a.send({ type: 'CHARGE', amount: 500 })
    const y0 = a.getSnapshot().context.yone
    await send(a, 'cake', '205', '수아')
    const c = a.getSnapshot().context
    expect(c.yone).toBe(y0 - price('cake'))
    expect(c.log.some((g) => g.fromMe && g.counterpartId === '205' && g.itemId === 'cake')).toBe(true)
    expect(c.signals['205']).toBe(1)
  })

  it('수신 → 인벤토리 + 로그(fromMe=false)', () => {
    const a = createActor(giftMachine).start()
    a.send({ type: 'RECEIVE_GIFT', itemId: 'champagne', fromId: '207', fromName: '민서' })
    const c = a.getSnapshot().context
    expect(c.received).toContain('champagne')
    expect(c.log.some((g) => !g.fromMe && g.itemId === 'champagne')).toBe(true)
  })

  it('요네 부족 → 전송 차단(guard)', async () => {
    const a = createActor(giftMachine).start()
    a.send({ type: 'CHARGE', amount: 500 })
    await send(a, 'bride_bouquet', 'c1', 'A') // 120
    await send(a, 'bride_bouquet', 'c2', 'B') // 120
    await send(a, 'bride_bouquet', 'c3', 'C') // 120
    await send(a, 'bride_bouquet', 'c4', 'D') // 120 → 합 480, 잔액 20
    const before = a.getSnapshot().context.yone
    a.send({ type: 'SEND_GIFT', itemId: 'cake', toId: 'c5', toName: 'E' }) // 60 > 20 차단
    expect(a.getSnapshot().value).toBe('idle')
    await vi.advanceTimersByTimeAsync(600)
    expect(a.getSnapshot().context.yone).toBe(before)
  })

  it('신뢰 신호는 같은 상대에게 누적', async () => {
    const a = createActor(giftMachine).start()
    a.send({ type: 'CHARGE', amount: 500 })
    await send(a, 'champagne', '205', '수아')
    await send(a, 'bouquet', '205', '수아')
    expect(a.getSnapshot().context.signals['205']).toBe(2)
  })

  it('CHARGE — 요네 충전', () => {
    const a = createActor(giftMachine).start()
    const y = a.getSnapshot().context.yone
    a.send({ type: 'CHARGE' })
    expect(a.getSnapshot().context.yone).toBe(y + 100)
  })
})
