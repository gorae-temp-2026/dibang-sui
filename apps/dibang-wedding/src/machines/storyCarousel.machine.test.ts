import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'
import { storyCarouselMachine } from './storyCarousel.machine'

// itemCounts [2,3,1] = 프로필0 글2개, 프로필1 글3개, 프로필2 글1개.
function open(groupIndex = 0, itemCounts = [2, 3, 1]) {
  const a = createActor(storyCarouselMachine).start()
  a.send({ type: 'OPEN', groupIndex, itemCounts })
  return a
}

describe('storyCarouselMachine', () => {
  it('OPEN → playing + 위치/itemCounts 시드', () => {
    const s = open(1).getSnapshot()
    expect(s.value).toBe('playing')
    expect(s.context.groupIndex).toBe(1)
    expect(s.context.itemIndex).toBe(0)
    expect(s.context.itemCounts).toEqual([2, 3, 1])
  })

  it('NEXT_ITEM: 같은 프로필 내 다음 글', () => {
    const a = open(0)
    a.send({ type: 'NEXT_ITEM' })
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 0, itemIndex: 1 })
  })

  it('NEXT_ITEM: 프로필 끝 → 다음 프로필 첫 글(롤오버)', () => {
    const a = open(0)
    a.send({ type: 'NEXT_ITEM' }) // 0,1 (프로필0 끝)
    a.send({ type: 'NEXT_ITEM' }) // → 1,0
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 1, itemIndex: 0 })
  })

  it('NEXT_ITEM: 마지막 프로필 마지막 글 → closed', () => {
    const a = open(2) // 프로필2(글1개) = 마지막의 마지막
    a.send({ type: 'NEXT_ITEM' })
    expect(a.getSnapshot().value).toBe('closed')
  })

  it('PREV_ITEM: 첫 글 → 이전 프로필 마지막 글(롤오버)', () => {
    const a = open(1) // 1,0
    a.send({ type: 'PREV_ITEM' }) // → 0, 마지막(itemCounts[0]-1=1)
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 0, itemIndex: 1 })
  })

  it('PREV_ITEM: 맨 앞(0,0)에서 멈춤(전이 없음)', () => {
    const a = open(0) // 0,0
    a.send({ type: 'PREV_ITEM' })
    expect(a.getSnapshot().value).toBe('playing')
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 0, itemIndex: 0 })
  })

  it('NEXT_PROFILE / PREV_PROFILE: 프로필 이동 + 양끝 멈춤', () => {
    const a = open(0)
    a.send({ type: 'NEXT_PROFILE' }) // → 1,0
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 1, itemIndex: 0 })
    a.send({ type: 'PREV_PROFILE' }) // → 0,0
    expect(a.getSnapshot().context).toMatchObject({ groupIndex: 0, itemIndex: 0 })
    a.send({ type: 'PREV_PROFILE' }) // 맨 앞 멈춤
    expect(a.getSnapshot().context.groupIndex).toBe(0)
  })

  it('NEXT_PROFILE: 마지막 프로필에서 멈춤', () => {
    const a = open(2)
    a.send({ type: 'NEXT_PROFILE' })
    expect(a.getSnapshot().context.groupIndex).toBe(2)
  })

  it('CLOSE: playing → closed', () => {
    const a = open(0)
    a.send({ type: 'CLOSE' })
    expect(a.getSnapshot().value).toBe('closed')
  })

  it('OPEN은 closed에서도 재시드(재오픈)', () => {
    const a = open(0)
    a.send({ type: 'CLOSE' })
    a.send({ type: 'OPEN', groupIndex: 1, itemCounts: [2, 3, 1] })
    const s = a.getSnapshot()
    expect(s.value).toBe('playing')
    expect(s.context.groupIndex).toBe(1)
  })
})
