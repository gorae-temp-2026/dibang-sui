/**
 * inyeon.machine — 디방인연 flow 단위 테스트.
 *  - 카드 탐색(필터·사진게이트) + 이음(전송→성사) 비동기 분기.
 *  - 오버레이/시트 네비(동시 1개 + 전환 규칙: profile은 detail을 닫고, ieum은 detail·profile을 닫음).
 *  - 채팅(DM) 방 열기 요네 게이트 + 메시지 전송 후 지연 자동응답.
 * 금지(TESTING.md): snapshot, implementation detail, waitForTimeout(→ fake timers).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, type Actor } from 'xstate'
import { inyeonMachine } from './inyeon.machine'
import { POOL, START_YONE, PHOTO_COST, DM_COST, INCOMING, seedDm } from '../components/inyeon/data'

const ctxOf = (a: Actor<typeof inyeonMachine>) => a.getSnapshot().context
const start = () => createActor(inyeonMachine).start()
// 기본 context 위에 일부만 덮은 초기 스냅샷으로 기동(요네 부족 등 도달하기 힘든 분기 검증용).
function startWith(patch: Partial<ReturnType<typeof ctxOf>>) {
  const base = createActor(inyeonMachine).getSnapshot().context
  return createActor(inyeonMachine, {
    snapshot: inyeonMachine.resolveState({ value: 'browsing', context: { ...base, ...patch } }),
  }).start()
}

describe('inyeon.machine — 초기', () => {
  it('browsing에서 시작, 요네=START, 오버레이·채팅 비었음', () => {
    const s = start().getSnapshot()
    expect(s.value).toBe('browsing')
    expect(s.context.yone).toBe(START_YONE)
    expect(s.context.screen).toBe('universe')
    expect(s.context.detailId).toBeNull()
    expect(s.context.profileMoiId).toBeNull()
    expect(s.context.filterOpen).toBe(false)
    expect(s.context.myProfileOpen).toBe(false)
    expect(s.context.dmRoomId).toBeNull()
    expect(s.context.dms).toEqual({})
    expect(s.context.incoming).toEqual(INCOMING)
  })
})

describe('inyeon.machine — 카드 탐색', () => {
  it('SET_FILTER → 범위 반영 + 큐 재구성(범위 밖 모이 제외)', () => {
    const a = start()
    a.send({ type: 'SET_FILTER', degMin: 1, degMax: 1 })
    const c = ctxOf(a)
    expect(c.degMin).toBe(1)
    expect(c.degMax).toBe(1)
    // deg=1 모이만 큐에
    expect(c.queue.every((id) => POOL.find((m) => m.id === id)!.deg === 1)).toBe(true)
  })

  it('UNLOCK_PHOTOS → 요네 PHOTO_COST 차감 + 잠금 해제(중복 차감 없음)', () => {
    const a = start()
    const id = POOL[0].id
    a.send({ type: 'UNLOCK_PHOTOS', id })
    expect(ctxOf(a).yone).toBe(START_YONE - PHOTO_COST)
    expect(ctxOf(a).unlocked[id]).toBe(true)
    a.send({ type: 'UNLOCK_PHOTOS', id }) // 이미 해제 → guard 차단
    expect(ctxOf(a).yone).toBe(START_YONE - PHOTO_COST)
  })

  it('SWIPE_NEXT → 큐 맨 앞 제거', () => {
    const a = start()
    const first = ctxOf(a).queue[0]
    a.send({ type: 'SWIPE_NEXT' })
    expect(ctxOf(a).queue[0]).not.toBe(first)
  })
})

describe('inyeon.machine — 이음(전송→성사)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('OPEN_IEUM → composing(activeId 설정), SEND_IEUM → sending → matched, DISMISS → browsing(큐에서 제거)', async () => {
    const a = start()
    const id = ctxOf(a).queue[0]
    a.send({ type: 'OPEN_IEUM', id })
    expect(a.getSnapshot().value).toBe('composing')
    expect(ctxOf(a).activeId).toBe(id)
    a.send({ type: 'SEND_IEUM' })
    expect(a.getSnapshot().value).toBe('sending')
    await vi.advanceTimersByTimeAsync(700) // mock 650ms 수락
    expect(a.getSnapshot().value).toBe('matched')
    expect(ctxOf(a).matchedIds).toContain(id)
    a.send({ type: 'DISMISS_MATCH' })
    expect(a.getSnapshot().value).toBe('browsing')
    expect(ctxOf(a).queue).not.toContain(id)
  })

  it('CANCEL_IEUM → browsing 복귀(activeId 해제)', () => {
    const a = start()
    a.send({ type: 'OPEN_IEUM', id: ctxOf(a).queue[0] })
    a.send({ type: 'CANCEL_IEUM' })
    expect(a.getSnapshot().value).toBe('browsing')
    expect(ctxOf(a).activeId).toBeNull()
  })
})

describe('inyeon.machine — 받은이음', () => {
  it('ACCEPT_REQ → matched + chatOpen + incoming에서 제거', () => {
    const a = start()
    const moiId = INCOMING[0].moiId
    a.send({ type: 'ACCEPT_REQ', moiId })
    expect(ctxOf(a).matchedIds).toContain(moiId)
    expect(ctxOf(a).chatOpen[moiId]).toBe(true)
    expect(ctxOf(a).incoming.some((r) => r.moiId === moiId)).toBe(false)
  })

  it('DECLINE_REQ → incoming에서만 제거(매칭 안 됨)', () => {
    const a = start()
    const moiId = INCOMING[0].moiId
    a.send({ type: 'DECLINE_REQ', moiId })
    expect(ctxOf(a).incoming.some((r) => r.moiId === moiId)).toBe(false)
    expect(ctxOf(a).matchedIds).not.toContain(moiId)
  })
})

describe('inyeon.machine — 오버레이/시트 네비', () => {
  it('OPEN_DETAIL/CLOSE_DETAIL', () => {
    const a = start()
    a.send({ type: 'OPEN_DETAIL', id: 201 })
    expect(ctxOf(a).detailId).toBe(201)
    a.send({ type: 'CLOSE_DETAIL' })
    expect(ctxOf(a).detailId).toBeNull()
  })

  it('OPEN_PROFILE → detail을 닫는다(동시 1개)', () => {
    const a = start()
    a.send({ type: 'OPEN_DETAIL', id: 201 })
    a.send({ type: 'OPEN_PROFILE', id: 201 })
    expect(ctxOf(a).profileMoiId).toBe(201)
    expect(ctxOf(a).detailId).toBeNull()
  })

  it('OPEN_IEUM → detail·profile 오버레이를 닫고 composing', () => {
    const a = start()
    a.send({ type: 'OPEN_DETAIL', id: 201 })
    a.send({ type: 'OPEN_PROFILE', id: 202 })
    a.send({ type: 'OPEN_IEUM', id: 202 })
    expect(a.getSnapshot().value).toBe('composing')
    expect(ctxOf(a).detailId).toBeNull()
    expect(ctxOf(a).profileMoiId).toBeNull()
    expect(ctxOf(a).activeId).toBe(202)
  })

  it('OPEN/CLOSE_MY_PROFILE · OPEN/CLOSE_FILTER 토글', () => {
    const a = start()
    a.send({ type: 'OPEN_MY_PROFILE' })
    expect(ctxOf(a).myProfileOpen).toBe(true)
    a.send({ type: 'CLOSE_MY_PROFILE' })
    expect(ctxOf(a).myProfileOpen).toBe(false)
    a.send({ type: 'OPEN_FILTER' })
    expect(ctxOf(a).filterOpen).toBe(true)
    a.send({ type: 'CLOSE_FILTER' })
    expect(ctxOf(a).filterOpen).toBe(false)
  })
})

describe('inyeon.machine — 채팅(DM) 게이트', () => {
  const tier0 = POOL.find((m) => m.tier === 0)!.id // DM_COST 0
  const tier1 = POOL.find((m) => m.tier === 1)!.id // DM_COST 50

  it('tier0(무료) OPEN_DM_ROOM → 차감 없이 방 열림 + dms 시드', () => {
    const a = start()
    a.send({ type: 'OPEN_DM_ROOM', id: tier0 })
    const c = ctxOf(a)
    expect(c.yone).toBe(START_YONE) // 무료
    expect(c.chatOpen[tier0]).toBe(true)
    expect(c.dmRoomId).toBe(tier0)
    expect(c.dms[tier0]).toEqual(seedDm())
  })

  it('tier1(유료) 첫 진입 → 요네 DM_COST 차감, 재진입은 무료', () => {
    const a = start()
    a.send({ type: 'OPEN_DM_ROOM', id: tier1 })
    expect(ctxOf(a).yone).toBe(START_YONE - DM_COST[1])
    a.send({ type: 'CLOSE_DM_ROOM' })
    a.send({ type: 'OPEN_DM_ROOM', id: tier1 }) // 이미 chatOpen → 무료
    expect(ctxOf(a).yone).toBe(START_YONE - DM_COST[1])
    expect(ctxOf(a).dmRoomId).toBe(tier1)
  })

  it('요네 부족 → error만, 방 안 열림(차감 없음)', () => {
    const a = startWith({ yone: 10 })
    const tier2 = POOL.find((m) => m.tier === 2)!.id // DM_COST 200 > 10
    a.send({ type: 'OPEN_DM_ROOM', id: tier2 })
    const c = ctxOf(a)
    expect(c.dmRoomId).toBeNull()
    expect(c.chatOpen[tier2]).toBeUndefined()
    expect(c.yone).toBe(10)
    expect(c.error).toBeTruthy()
  })
})

describe('inyeon.machine — 채팅 메시지/메모리', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('SEND_DM → 내 메시지 즉시 append, 900ms 뒤 상대 자동응답', async () => {
    const a = start()
    const id = POOL.find((m) => m.tier === 0)!.id
    a.send({ type: 'OPEN_DM_ROOM', id })
    const seeded = ctxOf(a).dms[id].length
    a.send({ type: 'SEND_DM', id, text: '안녕하세요' })
    const afterSend = ctxOf(a).dms[id]
    expect(afterSend.length).toBe(seeded + 1)
    expect(afterSend.at(-1)?.me).toBe('안녕하세요')
    await vi.advanceTimersByTimeAsync(900)
    const afterReply = ctxOf(a).dms[id]
    expect(afterReply.length).toBe(seeded + 2)
    expect(afterReply.at(-1)?.them).toBeTruthy()
  })

  it('OPEN_MEMORY/CLOSE_MEMORY', () => {
    const a = start()
    a.send({ type: 'OPEN_MEMORY', id: 201 })
    expect(ctxOf(a).memoryId).toBe(201)
    a.send({ type: 'CLOSE_MEMORY' })
    expect(ctxOf(a).memoryId).toBeNull()
  })

  it('다른 화면으로 NAV(chat 떠남) → 열린 DM방·메모리·대화기록 초기화(원본 언마운트 보존)', async () => {
    const a = start()
    a.send({ type: 'NAV', screen: 'chat' })
    const id = POOL.find((m) => m.tier === 0)!.id
    a.send({ type: 'OPEN_DM_ROOM', id })
    a.send({ type: 'SEND_DM', id, text: '안녕' }) // 900ms 뒤 자동응답 예약됨
    a.send({ type: 'OPEN_MEMORY', id })
    expect(ctxOf(a).dmRoomId).toBe(id)
    a.send({ type: 'NAV', screen: 'universe' }) // chat → universe (화면 바뀜 = 언마운트)
    const c = ctxOf(a)
    expect(c.dmRoomId).toBeNull()
    expect(c.memoryId).toBeNull()
    expect(c.dms).toEqual({})
    expect(c.screen).toBe('universe')
    // 보류 중이던 자동응답이 뒤늦게 와도 닫힌 대화를 되살리지 않는다(원본: 언마운트로 콜백 무효).
    await vi.advanceTimersByTimeAsync(900)
    expect(ctxOf(a).dms).toEqual({})
  })

  it('같은 화면 재NAV(chat 탭 재클릭) → 열린 DM방·메시지 유지(원본: 언마운트 안 됨)', () => {
    const a = start()
    a.send({ type: 'NAV', screen: 'chat' })
    const id = POOL.find((m) => m.tier === 0)!.id
    a.send({ type: 'OPEN_DM_ROOM', id })
    a.send({ type: 'SEND_DM', id, text: '안녕' })
    a.send({ type: 'NAV', screen: 'chat' }) // 같은 화면 재NAV
    const c = ctxOf(a)
    expect(c.dmRoomId).toBe(id) // 유지
    expect(c.dms[id]).toBeDefined()
    expect(c.dms[id].some((msg) => msg.me === '안녕')).toBe(true)
  })
})
