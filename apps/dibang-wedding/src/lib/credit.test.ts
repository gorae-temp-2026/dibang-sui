import { describe, it, expect } from 'vitest'
import { creditFromEvents, ACTION, EVENT, ROLE, type ActionLoggedEvent, type EventCreatedEvent, type ParticipatedEvent } from './credit'

const WED = 'ev_wedding'
const weddingEvents: EventCreatedEvent[] = [{ eventId: WED, eventType: EVENT.WEDDING, creator: 'host' }]

const busu = (actor: string, target: string, amount: number): ActionLoggedEvent => ({
  eventId: WED, actionType: ACTION.GIVE_MONEY, actor, target, roleId: ROLE.GUEST, amount, ts: 0,
})
const cs = (action: number, actor: string, target: string, roleId: number, eventId = WED): ActionLoggedEvent => ({
  eventId, actionType: action, actor, target, roleId, amount: 0, ts: 0,
})

describe('creditFromEvents (신뢰→신용)', () => {
  it('부조: 베푼 쪽이 적립, 기여 몫에 비례 (PHI-5 reversed-giving)', () => {
    // guest1이 100k(2/3), guest2가 50k(1/3)를 같은 혼주에게 부조.
    const { credit, components } = creditFromEvents([busu('guest1', 'host', 100_000), busu('guest2', 'host', 50_000)], weddingEvents)
    const g1 = components['guest1']!
    const g2 = components['guest2']!
    const host = components['host']!
    // 더 큰 몫을 베푼 guest1이 더 높은 부조 신용.
    expect(g1.busu).toBeGreaterThan(g2.busu)
    // 받기만 한 혼주는 부조 적립 없음(받는 행위는 신용 안 쌓음).
    expect(g1.busu).toBeGreaterThan(host.busu)
    // 모든 신용은 0~1.
    for (const v of Object.values(credit)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('CS: 방명록·초대의 대상이 유대(in-tie) 적립', () => {
    const { components } = creditFromEvents(
      [cs(ACTION.WRITE_MESSAGE, 'guest1', 'host', ROLE.GUEST), cs(ACTION.INVITE, 'host', 'guest1', ROLE.HOST)],
      weddingEvents,
    )
    expect(components['host']!.cs).toBeGreaterThan(0) // 방명록을 받음
    expect(components['guest1']!.cs).toBeGreaterThan(0) // 초대를 받음
  })

  it('선물(GIFT)은 CS만 — 부조 전파에서 제외(MOICREDIT_AUDIT)', () => {
    const evs: EventCreatedEvent[] = [{ eventId: 'ev_inyeon', eventType: EVENT.INYEON, creator: 'a' }]
    const { components } = creditFromEvents([cs(ACTION.GIFT, 'a', 'b', ROLE.INITIATOR, 'ev_inyeon')], evs)
    expect(components['b']!.cs).toBeGreaterThan(0) // b가 선물 받음 → CS
    expect(components['a']!.busu).toBe(0) // 선물은 부조 신용에 0 기여
    expect(components['b']!.busu).toBe(0)
  })

  it('GIVE_MONEY는 결혼식 하객→혼주만 부조로 집계(맥락 가드)', () => {
    // event_type 매핑 없으면(=미등록) 부조로 안 잡힘.
    const { components } = creditFromEvents([busu('g', 'h', 100_000)], [])
    expect(Object.keys(components).length).toBe(2) // 노드는 등장
    expect(components['g']!.busu).toBe(0) // 그러나 event_type 미해석이라 부조 0
  })

  it('참석(Participated)은 참가자→혼주 CS, 혼주 본인 참가는 제외 (I1)', () => {
    const participated: ParticipatedEvent[] = [
      { eventId: WED, participant: 'guest1', roleId: ROLE.GUEST },
      { eventId: WED, participant: 'host', roleId: ROLE.HOST }, // 자기 이벤트(혼주 본인) → 출석 엣지 아님
    ]
    const { components } = creditFromEvents([], weddingEvents, participated)
    expect(components['host']!.cs).toBeGreaterThan(0) // 하객 참석 → 혼주에게 CS
    expect(components['guest1']!.cs).toBe(0) // guest1은 받은 유대 없음
  })

  it('자기엣지(actor==target)는 0 기여 — 자기거래 농사 차단 (I3)', () => {
    const actions = [busu('self', 'self', 100_000), cs(ACTION.GIFT, 'self', 'self', ROLE.GUEST)]
    const { components } = creditFromEvents(actions, weddingEvents)
    expect(components['self']!.busu).toBe(0)
    expect(components['self']!.cs).toBe(0)
  })

  it('빈 입력 → 빈 신용', () => {
    expect(Object.keys(creditFromEvents([], []).credit).length).toBe(0)
  })
})
