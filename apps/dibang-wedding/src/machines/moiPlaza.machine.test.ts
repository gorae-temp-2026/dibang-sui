/**
 * 모이가모인곳(④) 광장 머신 — 샵 경제 로직 단위 테스트(손그림 에셋 카탈로그).
 *  - 구매 = 요네 차감(1회) + '내 아이템'(owned)으로만 이동(즉시 착용/배치 안 함).
 *  - 착용(EQUIP)/배치(PLACE)는 내 아이템에서 확정 — 무료 토글. 인테리어=다중 구매·배치(보유 수 한도, uid).
 *  - 기본 헤어·옷(무료)은 시작부터 보유·장착. 요네 부족 시 guard 차단.
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

describe('moiPlaza 머신 (샵 경제 · 인벤토리)', () => {
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

  it('구매 = 내 아이템(owned)으로만 이동(즉시 착용 안 함) + 요네 차감', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'suit')
    const c = a.getSnapshot().context
    expect(c.yone).toBe(START_YONE_PLAZA - price('suit'))
    expect(c.owned).toContain('suit')
    expect(c.equipped.body).toBe('casual') // 구매만으론 장착 안 됨(확정 필요)
  })

  it('구매 후 EQUIP로 착용(옷·헤어·액세서리)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'suit')
    a.send({ type: 'EQUIP', itemId: 'suit' })
    await buy(a, 'chu_buzz')
    a.send({ type: 'EQUIP', itemId: 'chu_buzz' })
    await buy(a, 'flower_crown')
    a.send({ type: 'EQUIP', itemId: 'flower_crown' })
    const c = a.getSnapshot().context
    expect(c.equipped.body).toBe('suit')
    expect(c.equipped.head).toBe('chu_buzz')
    expect(c.equipped.acc).toBe('flower_crown')
  })

  it('인테리어 구매 후 PLACE로 배치(uid 인스턴스)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'fountain')
    expect(a.getSnapshot().context.placed).toEqual([]) // 구매만으론 배치 안 됨
    a.send({ type: 'PLACE', itemId: 'fountain' })
    const placed = a.getSnapshot().context.placed
    expect(placed.length).toBe(1)
    expect(placed[0].itemId).toBe('fountain')
    expect(placed[0].uid).toBeTruthy()
  })

  it('인테리어 다중 구매·다중 배치(버진로드 여러 개, 보유 수 한도)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'aisle_runner')
    await buy(a, 'aisle_runner')
    expect(a.getSnapshot().context.owned.filter((i) => i === 'aisle_runner').length).toBe(2)
    a.send({ type: 'PLACE', itemId: 'aisle_runner' })
    a.send({ type: 'PLACE', itemId: 'aisle_runner' })
    a.send({ type: 'PLACE', itemId: 'aisle_runner' }) // 보유 2개 한도 → 3번째 무시
    expect(a.getSnapshot().context.placed.filter((p) => p.itemId === 'aisle_runner').length).toBe(2)
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

  it('착용류(옷) 보유 시 재구매 차단(중복 차감 없음)', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'suit')
    const after = a.getSnapshot().context.yone
    await buy(a, 'suit') // 옷=1개 한도, 재구매 차단
    expect(a.getSnapshot().context.yone).toBe(after)
  })

  it('배치(PLACE)/제거(REMOVE uid) 토글은 무료', async () => {
    const a = createActor(moiPlazaMachine).start()
    await buy(a, 'chair')
    const yoneAfterBuy = a.getSnapshot().context.yone
    a.send({ type: 'PLACE', itemId: 'chair' })
    const uid = a.getSnapshot().context.placed[0].uid
    a.send({ type: 'REMOVE', uid })
    expect(a.getSnapshot().context.placed.length).toBe(0)
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
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getSnapshot().context.toast).toBe('둘째 토스트') // 재시작돼 유지
    await vi.advanceTimersByTimeAsync(700)
    expect(a.getSnapshot().context.toast).toBeNull()
  })
})
