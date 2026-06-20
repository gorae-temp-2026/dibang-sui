/**
 * 모이가모인곳(④) 미니룸 머신 — 샵 경제 로직 단위 테스트.
 *  - 구매 = 요네 차감(1회) + 자동 배치(인테리어)/장착(옷).
 *  - 요네 부족 시 guard 차단.
 *  - 배치/제거·장착/해제 토글은 무료.
 * ※ 캔버스(MoiRoomCanvas, PixiJS)는 jsdom 비대상 → 타입체크+빌드로 검증(profile.test 선례).
 * 금지(TESTING.md): snapshot, implementation detail, waitForTimeout(→ fake timers 사용).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, type Actor } from 'xstate'
import { moiRoomMachine } from './moiRoom.machine'
import { SHOP, START_YONE_ROOM, CHARGE_AMOUNT } from '../components/moi-gather/data'

const price = (id: string) => SHOP.find((s) => s.id === id)!.yone

// 구매 비동기(mock 500ms) 정착까지 fake timer 진행.
async function buy(actor: Actor<typeof moiRoomMachine>, itemId: string) {
  actor.send({ type: 'PURCHASE', itemId })
  await vi.advanceTimersByTimeAsync(600)
}

describe('moiRoom 머신 (샵 경제)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('초기 — 요네=START, 보유·배치·장착 비었음', () => {
    const a = createActor(moiRoomMachine).start()
    const c = a.getSnapshot().context
    expect(c.yone).toBe(START_YONE_ROOM)
    expect(c.owned).toEqual([])
    expect(c.placed).toEqual([])
  })

  it('옷 구매 → 요네 차감 + 자동 장착(슬롯)', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'hanbok')
    const c = a.getSnapshot().context
    expect(c.yone).toBe(START_YONE_ROOM - price('hanbok'))
    expect(c.owned).toContain('hanbok')
    expect(c.equipped.body).toBe('hanbok')
  })

  it('인테리어 구매 → 자동 배치', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'fountain')
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'fountain')).toBe(true)
  })

  it('요네 부족 → 구매 차단(guard), 잔액·보유 불변', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'hanbok') // 90
    await buy(a, 'suit') //   50
    await buy(a, 'fountain') // 120 → 합 260, 잔액 40
    const before = a.getSnapshot().context.yone
    a.send({ type: 'PURCHASE', itemId: 'wreath' }) // 80 > 40 → 차단
    expect(a.getSnapshot().value).toBe('idle') // purchasing으로 안 감
    await vi.advanceTimersByTimeAsync(600)
    expect(a.getSnapshot().context.owned).not.toContain('wreath')
    expect(a.getSnapshot().context.yone).toBe(before)
  })

  it('이미 보유한 것 재구매 차단(중복 차감 없음)', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'pot')
    const after = a.getSnapshot().context.yone
    await buy(a, 'pot') // 이미 보유 → guard 차단
    expect(a.getSnapshot().context.yone).toBe(after)
  })

  it('배치/제거 토글은 무료', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'pot') // 보유 + 자동 배치
    const yoneAfterBuy = a.getSnapshot().context.yone
    a.send({ type: 'REMOVE', itemId: 'pot' })
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'pot')).toBe(false)
    a.send({ type: 'PLACE', itemId: 'pot' })
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'pot')).toBe(true)
    expect(a.getSnapshot().context.yone).toBe(yoneAfterBuy) // 무료
  })

  it('장착/해제 토글', async () => {
    const a = createActor(moiRoomMachine).start()
    await buy(a, 'ribbon') // head 슬롯
    expect(a.getSnapshot().context.equipped.head).toBe('ribbon')
    a.send({ type: 'UNEQUIP', slot: 'head' })
    expect(a.getSnapshot().context.equipped.head).toBeUndefined()
    a.send({ type: 'EQUIP', itemId: 'ribbon' })
    expect(a.getSnapshot().context.equipped.head).toBe('ribbon')
  })

  it('CHARGE — 요네 충전', () => {
    const a = createActor(moiRoomMachine).start()
    a.send({ type: 'CHARGE' })
    expect(a.getSnapshot().context.yone).toBe(START_YONE_ROOM + CHARGE_AMOUNT)
  })
})
