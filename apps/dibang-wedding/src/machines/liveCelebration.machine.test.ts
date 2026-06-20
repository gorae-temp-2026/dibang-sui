/**
 * liveCelebration.machine — LIVE 축하메시지 자동 순환.
 *  - 메시지 2개 이상일 때만 ROTATE_MS마다 다음으로(끝→처음 wrap).
 *  - 1개 이하면 고정(순환 없음).
 *  - count 변경 시 idx를 새 범위로 클램프 + 타이머 재시작.
 * 금지(TESTING.md): snapshot, implementation detail, waitForTimeout(→ fake timers).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor } from 'xstate'
import { liveCelebrationMachine, ROTATE_MS } from './liveCelebration.machine'

describe('liveCelebration.machine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('초기 — idle, idx 0', () => {
    const s = createActor(liveCelebrationMachine).start().getSnapshot()
    expect(s.value).toBe('idle')
    expect(s.context.idx).toBe(0)
  })

  it('메시지 1개 → 순환 안 함(idle 유지, idx 고정)', async () => {
    const a = createActor(liveCelebrationMachine).start()
    a.send({ type: 'SET_COUNT', count: 1 })
    expect(a.getSnapshot().value).toBe('idle')
    await vi.advanceTimersByTimeAsync(ROTATE_MS * 2)
    expect(a.getSnapshot().context.idx).toBe(0)
  })

  it('메시지 3개 → ROTATE_MS마다 1→2→0 순환', async () => {
    const a = createActor(liveCelebrationMachine).start()
    a.send({ type: 'SET_COUNT', count: 3 })
    expect(a.getSnapshot().value).toBe('rotating')
    await vi.advanceTimersByTimeAsync(ROTATE_MS)
    expect(a.getSnapshot().context.idx).toBe(1)
    await vi.advanceTimersByTimeAsync(ROTATE_MS)
    expect(a.getSnapshot().context.idx).toBe(2)
    await vi.advanceTimersByTimeAsync(ROTATE_MS)
    expect(a.getSnapshot().context.idx).toBe(0) // wrap
  })

  it('count 줄면 idx를 새 범위로 클램프', async () => {
    const a = createActor(liveCelebrationMachine).start()
    a.send({ type: 'SET_COUNT', count: 3 })
    await vi.advanceTimersByTimeAsync(ROTATE_MS * 2) // idx=2
    expect(a.getSnapshot().context.idx).toBe(2)
    a.send({ type: 'SET_COUNT', count: 2 }) // 2 % 2 = 0
    expect(a.getSnapshot().context.idx).toBe(0)
  })

  it('count 0 → idle로', () => {
    const a = createActor(liveCelebrationMachine).start()
    a.send({ type: 'SET_COUNT', count: 3 })
    expect(a.getSnapshot().value).toBe('rotating')
    a.send({ type: 'SET_COUNT', count: 0 })
    expect(a.getSnapshot().value).toBe('idle')
    expect(a.getSnapshot().context.idx).toBe(0)
  })
})
