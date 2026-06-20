/**
 * 모이가모인곳(④) 광장 머신 — 샵 경제 로직 단위 테스트(손그림 에셋 카탈로그).
 *  - 구매 = 요네 차감(1회) + 자동 배치(인테리어)/장착(헤어·옷·액세서리 슬롯).
 *  - 기본 헤어·옷(무료)은 시작부터 보유·장착. 요네 부족 시 guard 차단.
 *  - 배치/제거·장착/해제 토글은 무료.
 * ※ 캔버스(MoiPlazaCanvas, PixiJS)는 jsdom 비대상 → 타입체크+빌드로 검증(profile.test 선례).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, type Actor } from 'xstate'
import { moiPlazaMachine } from './moiPlaza.machine'
import { SHOP, START_YONE_PLAZA, CHARGE_AMOUNT } from '../components/moi-gather/data'

const price = (id: string) => SHOP.find((s) => s.id === id)!.yone

async function buy(actor: Actor<typeof moiPlazaMachine>, itemId: string) {
  actor.send({ type: 'PURCHASE', itemId })
  await vi.advanceTimersByTimeAsync(600)
}

describe('moiPlaza 머신 (샵 경제)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('초기 — 요네=START, 기본 헤어·옷 장착·보유, 배치 비었음', () => {
    const c = createActor(moiPlazaMachine).start().getSnapshot().context
    expect(c.yone).toBe(START_YONE_PLAZA)
    expect(c.equipped.head).toBe('chu_default')
    expect(c.equipped.body).toBe('casual')
    expect(c.owned).toContain('casual')
    expect(c.placed).toEqual([])
  })

  it('옷(바디) 구매 → 요네 차감 + 자동 장착(body)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'suit')
    const c = a.getSnapshot().context
    expect(c.yone).toBe(START_YONE_PLAZA - price('suit'))
    expect(c.equipped.body).toBe('suit')
  })

  it('헤어 구매 → 자동 장착(head)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'chu_buzz')
    expect(a.getSnapshot().context.equipped.head).toBe('chu_buzz')
  })

  it('액세서리 구매 → 자동 장착(acc)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'flower_crown')
    expect(a.getSnapshot().context.equipped.acc).toBe('flower_crown')
  })

  it('인테리어 구매 → 자동 배치', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'fountain')
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'fountain')).toBe(true)
  })

  it('요네 부족 → 구매 차단(guard), 잔액·보유 불변', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'bride_bouquet') // 120
    await buy(a, 'fountain') // 120 → 합 240, 잔액 60
    const before = a.getSnapshot().context.yone
    a.send({ type: 'PURCHASE', itemId: 'arch' }) // 100 > 60 → 차단
    expect(a.getSnapshot().value).toBe('idle')
    await vi.advanceTimersByTimeAsync(600)
    expect(a.getSnapshot().context.owned).not.toContain('arch')
    expect(a.getSnapshot().context.yone).toBe(before)
  })

  it('이미 보유한 것 재구매 차단(중복 차감 없음)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'cake')
    const after = a.getSnapshot().context.yone
    await buy(a, 'cake')
    expect(a.getSnapshot().context.yone).toBe(after)
  })

  it('배치/제거 토글은 무료', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'chair')
    const yoneAfterBuy = a.getSnapshot().context.yone
    a.send({ type: 'REMOVE', itemId: 'chair' })
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'chair')).toBe(false)
    a.send({ type: 'PLACE', itemId: 'chair' })
    expect(a.getSnapshot().context.placed.some((p) => p.itemId === 'chair')).toBe(true)
    expect(a.getSnapshot().context.yone).toBe(yoneAfterBuy)
  })

  it('기본 헤어로 무료 전환(기본=보유)', () => {
    const a = createActor(moiPlazaMachine).start()
    a.send({ type: 'EQUIP', itemId: 'yh_pigtail' }) // 기본=보유 → 무료 장착
    expect(a.getSnapshot().context.equipped.head).toBe('yh_pigtail')
  })

  it('CHARGE — 요네 충전', () => {
    const a = createActor(moiPlazaMachine).start()
    a.send({ type: 'CHARGE' })
    expect(a.getSnapshot().context.yone).toBe(START_YONE_PLAZA + CHARGE_AMOUNT)
  })

  it('SHOW_TOAST → 표시 후 2600ms 뒤 자동 소멸', async () => {
    const a = createActor(moiPlazaMachine).start()
    a.send({ type: 'SHOW_TOAST', message: '이음 신청을 보냈어요' })
    expect(a.getSnapshot().context.toast).toBe('이음 신청을 보냈어요')
    await vi.advanceTimersByTimeAsync(2599)
    expect(a.getSnapshot().context.toast).toBe('이음 신청을 보냈어요') // 아직 유지
    await vi.advanceTimersByTimeAsync(2)
    expect(a.getSnapshot().context.toast).toBeNull() // 소멸
  })

  it('새 SHOW_TOAST → 타이머 재시작(이전 예약 취소)', async () => {
    const a = createActor(moiPlazaMachine).start()
    a.send({ type: 'SHOW_TOAST', message: '첫 토스트' })
    await vi.advanceTimersByTimeAsync(2000)
    a.send({ type: 'SHOW_TOAST', message: '둘째 토스트' }) // 타이머 재시작
    await vi.advanceTimersByTimeAsync(2000) // 첫 예약(총 2600)이 살아있으면 사라졌을 시점
    expect(a.getSnapshot().context.toast).toBe('둘째 토스트') // 재시작돼 유지
    await vi.advanceTimersByTimeAsync(700)
    expect(a.getSnapshot().context.toast).toBeNull()
  })
})
