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

  it('wash 부조(A↔B 순환, 같은 양)는 부조 신용 0 — net 전파로 상쇄 (시빌 방어)', () => {
    const inyeonless: EventCreatedEvent[] = [{ eventId: WED, eventType: EVENT.WEDDING, creator: 'A' }]
    const { components } = creditFromEvents([busu('A', 'B', 100_000), busu('B', 'A', 100_000)], inyeonless)
    expect(components['A']!.busu).toBe(0) // 자기들끼리 돌린 돈 → net 0 → 신용 0
    expect(components['B']!.busu).toBe(0)
  })

  it('비대칭 부조는 차액(net)만 신용 — 정직한 더-베풂 보존', () => {
    const evs: EventCreatedEvent[] = [{ eventId: WED, eventType: EVENT.WEDDING, creator: 'A' }]
    // A→B 100k, B→A 30k → A의 순부조 70k만 남음.
    const { components } = creditFromEvents([busu('A', 'B', 100_000), busu('B', 'A', 30_000)], evs)
    expect(components['A']!.busu).toBeGreaterThan(0)
    expect(components['B']!.busu).toBe(0)
  })

  it('CS: 방명록·초대의 대상이 유대(in-tie) 적립', () => {
    const { components } = creditFromEvents(
      [cs(ACTION.WRITE_MESSAGE, 'guest1', 'host', ROLE.GUEST), cs(ACTION.INVITE, 'host', 'guest1', ROLE.HOST)],
      weddingEvents,
    )
    expect(components['host']!.cs).toBeGreaterThan(0) // 방명록을 받음
    expect(components['guest1']!.cs).toBeGreaterThan(0) // 초대를 받음
  })

  it('CS authority: 고신뢰 노드에게 유대받으면 더 높음 (flat in-tie와 구별)', () => {
    const wm = (actor: string, target: string) => cs(ACTION.WRITE_MESSAGE, actor, target, ROLE.GUEST)
    const { components } = creditFromEvents(
      [
        wm('p1', 'hub'), wm('p2', 'hub'), wm('p3', 'hub'), // hub = 높은 authority(3명에게 유대받음)
        wm('hub', 'x'), // x는 고신뢰 hub에게 유대받음
        wm('z', 'y'), // y는 무신뢰 z(유대받은 적 없음)에게 유대받음
      ],
      weddingEvents,
    )
    // flat in-tie라면 x·y 둘 다 in-tie 1로 동률. authority라면 x>y(유대의 질).
    expect(components['x']!.cs).toBeGreaterThan(components['y']!.cs)
  })

  it('선물(GIFT)은 CS만 — 부조 전파에서 제외(MOICREDIT_AUDIT)', () => {
    const evs: EventCreatedEvent[] = [{ eventId: 'ev_inyeon', eventType: EVENT.INYEON, creator: 'a' }]
    const { components } = creditFromEvents([cs(ACTION.GIFT, 'a', 'b', ROLE.INITIATOR, 'ev_inyeon')], evs)
    expect(components['b']!.cs).toBeGreaterThan(0) // b가 선물 받음 → CS
    expect(components['a']!.busu).toBe(0) // 선물은 부조 신용에 0 기여
    expect(components['b']!.busu).toBe(0)
  })

  it('인연 매칭(INYEON)은 양방향 CS — Participated에서 도출, 양쪽 적립 (Critical1/I-CS1)', () => {
    const evs: EventCreatedEvent[] = [{ eventId: 'm', eventType: EVENT.INYEON, creator: 'initiator' }]
    // 매칭 성립 = INYEON Event + 양측 Participation(initiator=creator, receiver). ium은 ledger 미기록(§3-F).
    const participated: ParticipatedEvent[] = [
      { eventId: 'm', participant: 'initiator', roleId: ROLE.INITIATOR }, // 생성자 자신(자기엣지 제외)
      { eventId: 'm', participant: 'receiver', roleId: ROLE.RECEIVER },
    ]
    const { components } = creditFromEvents([], evs, participated)
    expect(components['initiator']!.cs).toBeGreaterThan(0)
    expect(components['receiver']!.cs).toBeGreaterThan(0) // 양방향 — 단방향이면 한쪽이 0
  })

  it('ACCEPT_IUM ActionLogged는 CS 무신호 — ium이 ledger 미기록이므로 (Critical1 회귀가드)', () => {
    // 인연 CS는 Participated 전담. 설령 ACCEPT_IUM 액션이 와도(실제론 안 생김) CS 0.
    const evs: EventCreatedEvent[] = [{ eventId: 'm', eventType: EVENT.INYEON, creator: 'initiator' }]
    const { components } = creditFromEvents([cs(ACTION.ACCEPT_IUM, 'receiver', 'initiator', ROLE.RECEIVER, 'm')], evs)
    expect(components['receiver']!.cs).toBe(0)
    expect(components['initiator']!.cs).toBe(0)
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

  it('e2e: 현실 다신호 시나리오(웨딩 + 인연 매칭)를 일관되게 fold (cross-module 통합)', () => {
    // 한 웨딩(WED): 혼주가 guest1·guest2 초대, 둘 다 참가, guest1 100k·guest2 50k 부조, guest1 방명록.
    // 별도 인연 매칭(m): alice(initiator)↔bob(receiver).
    const events: EventCreatedEvent[] = [
      { eventId: WED, eventType: EVENT.WEDDING, creator: 'host' },
      { eventId: 'm', eventType: EVENT.INYEON, creator: 'alice' },
    ]
    const actions: ActionLoggedEvent[] = [
      cs(ACTION.INVITE, 'host', 'guest1', ROLE.HOST),
      cs(ACTION.INVITE, 'host', 'guest2', ROLE.HOST),
      busu('guest1', 'host', 100_000),
      busu('guest2', 'host', 50_000),
      cs(ACTION.WRITE_MESSAGE, 'guest1', 'host', ROLE.GUEST),
    ]
    const participated: ParticipatedEvent[] = [
      { eventId: WED, participant: 'host', roleId: ROLE.HOST }, // 혼주 자신 — 출석 엣지 아님
      { eventId: WED, participant: 'guest1', roleId: ROLE.GUEST },
      { eventId: WED, participant: 'guest2', roleId: ROLE.GUEST },
      { eventId: 'm', participant: 'alice', roleId: ROLE.INITIATOR }, // creator
      { eventId: 'm', participant: 'bob', roleId: ROLE.RECEIVER },
    ]
    const { credit, components } = creditFromEvents(actions, events, participated)

    for (const v of Object.values(credit)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    // 부조: guest1이 더 큰 몫 → 더 높음. 혼주는 베푼 적 없어 부조 0.
    expect(components['guest1']!.busu).toBeGreaterThan(components['guest2']!.busu)
    expect(components['host']!.busu).toBe(0)
    // 혼주: 방명록·참석을 받아 CS>0(받는 쪽 적립).
    expect(components['host']!.cs).toBeGreaterThan(0)
    // 하객: 초대를 받아 CS>0.
    expect(components['guest1']!.cs).toBeGreaterThan(0)
    // 인연 매칭이 신용에 실제 기여 — 양쪽 CS>0 (Critical1 회귀가드: 인연→신용 연결 확인).
    expect(components['alice']!.cs).toBeGreaterThan(0)
    expect(components['bob']!.cs).toBeGreaterThan(0)
  })
})
