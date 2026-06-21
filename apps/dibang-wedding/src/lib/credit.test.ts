import { describe, it, expect } from 'vitest'
import type { SignalQuery } from '@gorae/sui-sdk'
import { creditFromSignals, KIND, type SignalEvent } from './credit'

// 온체인에서 분류된 신호(signal::SignalEmitted)를 흉내. 분류는 온체인 몫이므로 테스트는 신호를 직접 준다.
// source: 부조=GIVE_MONEY(0), CS 기본=WRITE_MESSAGE(4) — signal.move 미러.
const busu = (from: string, to: string, magnitude: number): SignalEvent => ({ kind: KIND.BUSU, source: 0, from, to, magnitude })
const cs = (from: string, to: string, source = 4): SignalEvent => ({ kind: KIND.CS, source, from, to, magnitude: 1 })

describe('creditFromSignals (신뢰→신용 · 온체인 분류 신호 집계)', () => {
  it('부조: 베푼 쪽이 적립, 기여 몫에 비례 (reversed-giving)', () => {
    const { credit, components } = creditFromSignals([busu('guest1', 'host', 100_000), busu('guest2', 'host', 50_000)])
    expect(components['guest1']!.busu).toBeGreaterThan(components['guest2']!.busu)
    expect(components['host']!.busu).toBe(0) // 받기만 한 혼주는 부조 적립 없음
    for (const v of Object.values(credit)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('wash 부조(A↔B 같은 양)는 부조 0 — net 상쇄 (시빌 방어)', () => {
    const { components } = creditFromSignals([busu('A', 'B', 100_000), busu('B', 'A', 100_000)])
    expect(components['A']!.busu).toBe(0)
    expect(components['B']!.busu).toBe(0)
  })

  it('비대칭 부조는 차액(net)만 — 정직한 더-베풂 보존', () => {
    const { components } = creditFromSignals([busu('A', 'B', 100_000), busu('B', 'A', 30_000)])
    expect(components['A']!.busu).toBeGreaterThan(0)
    expect(components['B']!.busu).toBe(0)
  })

  it('CS: 유대받는 쪽이 적립 (방명록·초대)', () => {
    const { components } = creditFromSignals([cs('guest1', 'host'), cs('host', 'guest1')])
    expect(components['host']!.cs).toBeGreaterThan(0)
    expect(components['guest1']!.cs).toBeGreaterThan(0)
  })

  it('CS authority: 고신뢰 노드에게 유대받으면 더 높음', () => {
    const { components } = creditFromSignals([cs('p1', 'hub'), cs('p2', 'hub'), cs('p3', 'hub'), cs('hub', 'x'), cs('z', 'y')])
    expect(components['x']!.cs).toBeGreaterThan(components['y']!.cs)
  })

  it('매칭 양방향 CS: 양쪽 모두 적립 (인연)', () => {
    const { components } = creditFromSignals([cs('receiver', 'initiator'), cs('initiator', 'receiver')])
    expect(components['initiator']!.cs).toBeGreaterThan(0)
    expect(components['receiver']!.cs).toBeGreaterThan(0)
  })

  it('자기엣지 신호는 0 기여 (방어 — 온체인서 이미 걸러짐)', () => {
    const { components } = creditFromSignals([busu('self', 'self', 100_000), cs('self', 'self')])
    expect(components['self']!.busu).toBe(0)
    expect(components['self']!.cs).toBe(0)
  })

  it('e2e: 현실 다신호(웨딩 초대·방명록·부조 + 인연 매칭) 집계', () => {
    const signals: SignalEvent[] = [
      cs('host', 'guest1'), cs('host', 'guest2'), // 초대
      cs('guest1', 'host'), // 방명록
      busu('guest1', 'host', 100_000), busu('guest2', 'host', 50_000), // 부조
      cs('alice', 'bob'), cs('bob', 'alice'), // 인연 매칭(양방향)
    ]
    const { credit, components } = creditFromSignals(signals)
    for (const v of Object.values(credit)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(components['guest1']!.busu).toBeGreaterThan(components['guest2']!.busu)
    expect(components['host']!.busu).toBe(0)
    expect(components['host']!.cs).toBeGreaterThan(0) // 방명록·초대받음? 초대는 host→guest라 host는 방명록만 받음
    expect(components['guest1']!.cs).toBeGreaterThan(0) // 초대받음
    expect(components['alice']!.cs).toBeGreaterThan(0) // 매칭
    expect(components['bob']!.cs).toBeGreaterThan(0)
  })

  it('빈 입력 → 빈 신용', () => {
    expect(Object.keys(creditFromSignals([]).credit).length).toBe(0)
  })

  it('SDK SignalQuery shape를 그대로 집계 (SDK↔credit 드리프트 가드)', () => {
    // getSignalEvents 반환(SignalQuery: eventId·ts 포함)이 creditFromSignals에 그대로 들어가야 한다.
    // SignalQuery가 SignalEvent 필드를 잃으면 여기서 tsc가 깨진다(런타임 C-Q1류 드리프트를 컴파일타임 차단).
    const fromSdk: SignalQuery[] = [
      { eventId: '0x1', kind: KIND.BUSU, source: 0, from: 'g1', to: 'host', magnitude: 100_000, ts: 1 },
      { eventId: '0x1', kind: KIND.CS, source: 4, from: 'g1', to: 'host', magnitude: 1, ts: 2 },
    ]
    const { credit, components } = creditFromSignals(fromSdk)
    expect(components['g1']!.busu).toBeGreaterThan(0)
    expect(components['host']!.cs).toBeGreaterThan(0)
    for (const v of Object.values(credit)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
