/**
 * storyCarousel.machine — 2 state (closed/playing) + 전역 OPEN.
 *
 * 책임:
 *  - initial: closed, context (0,0).
 *  - OPEN(어떤 상태에서든): playing으로 이동 + 위치 setPos.
 *  - playing에서 SET_POS: 위치 갱신, 상태 유지.
 *  - playing → closed on CLOSE.
 */
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { storyCarouselMachine } from './storyCarousel.machine'

function spawn() {
  const actor = createActor(storyCarouselMachine)
  actor.start()
  return actor
}

describe('storyCarouselMachine', () => {
  it('initial: closed + (0,0)', () => {
    const s = spawn().getSnapshot()
    expect(s.value).toBe('closed')
    expect(s.context.groupIndex).toBe(0)
    expect(s.context.itemIndex).toBe(0)
  })

  it('closed에서 OPEN → playing + 위치 설정', () => {
    const actor = spawn()
    actor.send({ type: 'OPEN', groupIndex: 2, itemIndex: 5 })
    const s = actor.getSnapshot()
    expect(s.value).toBe('playing')
    expect(s.context.groupIndex).toBe(2)
    expect(s.context.itemIndex).toBe(5)
  })

  it('playing에서 OPEN 재시드(전역 핸들러) → 위치 갱신, 상태 playing 유지', () => {
    const actor = spawn()
    actor.send({ type: 'OPEN', groupIndex: 0, itemIndex: 0 })
    actor.send({ type: 'OPEN', groupIndex: 3, itemIndex: 7 })
    const s = actor.getSnapshot()
    expect(s.value).toBe('playing')
    expect(s.context.groupIndex).toBe(3)
    expect(s.context.itemIndex).toBe(7)
  })

  it('playing에서 SET_POS → 위치 갱신, 상태 유지', () => {
    const actor = spawn()
    actor.send({ type: 'OPEN', groupIndex: 0, itemIndex: 0 })
    actor.send({ type: 'SET_POS', groupIndex: 4, itemIndex: 8 })
    const s = actor.getSnapshot()
    expect(s.value).toBe('playing')
    expect(s.context.groupIndex).toBe(4)
    expect(s.context.itemIndex).toBe(8)
  })

  it('playing에서 CLOSE → closed', () => {
    const actor = spawn()
    actor.send({ type: 'OPEN', groupIndex: 0, itemIndex: 0 })
    actor.send({ type: 'CLOSE' })
    expect(actor.getSnapshot().value).toBe('closed')
  })

  it('closed에서 SET_POS는 무시(닫힘 상태에서 위치 변경 안 됨)', () => {
    const actor = spawn()
    // closed 상태에서 SET_POS 보내도 핸들러 없음(전역에도 정의 없음)
    actor.send({ type: 'SET_POS', groupIndex: 9, itemIndex: 9 })
    const s = actor.getSnapshot()
    expect(s.value).toBe('closed')
    expect(s.context.groupIndex).toBe(0)
    expect(s.context.itemIndex).toBe(0)
  })
})
