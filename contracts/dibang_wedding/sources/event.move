/// Event·Participation — 신뢰 그래프의 *방향* 원천이자 모든 이벤트를 관통하는 컨테이너.
///
/// 설계 근거(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION §3-C, §4, §8):
/// - `event_type`(웨딩·인연·…)이 project=f(action_type × event_type × role)의 한 축이라 온체인 조회 가능.
/// - `Participation`이 fold의 *방향*을 만든다(역할 없으면 부조가 무방향 → Φ의 w(g,h)=give/recv 정의 불가).
/// - 활동·관계 기록은 soulbound(key-only) — 역할은 매매·이전 불가.
/// - 역할 위조 1차 방어(§8 V4): 권위 역할(혼주·주례)은 *생성자만* 부여(assign_role) / self-claimable
///   역할(하객·신청자·수신자)만 self 참가. 나머지 시빌(가짜 이벤트 등)은 raw가 sybil-permissive →
///   오프체인 Φ가 거른다(설계 §2-8). 신원-불가지: 사람 식별정보 온체인 X, 지갑 주소 그래프만.
module dibang_wedding::event;

use sui::clock::Clock;
use sui::event;

// === Errors ===
const EInvalidEventType: u64 = 0;
const EInvalidRole: u64 = 1;
/// participate로 권위 역할(혼주·주례)을 self 선언하려 함 — 금지(assign_role로만).
const ENotSelfClaimable: u64 = 2;
/// assign_role을 이벤트 생성자가 아닌 자가 호출.
const ENotCreator: u64 = 3;

// === Constants: event_type ===
/// 결혼식 1회. 부조(EM)·유대(CS) 본진.
const EVENT_WEDDING: u8 = 0;
/// 인연 매칭 1회(request_ium→accept_ium). 이음(CS) 본진.
const EVENT_INYEON: u8 = 1;
/// 정의된 event_type 최댓값(경계 검증용). 새 타입 추가 시 갱신.
const EVENT_TYPE_MAX: u8 = 1;

// === Constants: role_id (방향의 원천) ===
const ROLE_HOST: u8 = 0; // 혼주 (권위 — assign만)
const ROLE_GUEST: u8 = 1; // 하객 (self)
const ROLE_OFFICIANT: u8 = 2; // 주례 (권위 — assign만)
const ROLE_INITIATOR: u8 = 3; // 인연 신청자 (self)
const ROLE_RECEIVER: u8 = 4; // 인연 수신자 (self)
/// 정의된 role 최댓값(경계 검증용).
const ROLE_MAX: u8 = 4;

// === Structs ===

/// 이벤트 인스턴스(결혼식 1회·매칭 1회…). shared라 다수 참가자가 참조·상호작용한다.
/// raw 사실만 — event_type·생성자·시각. 이름 등 민감정보는 담지 않는다. (삭제 함수 없음 = event_id 영속.)
public struct Event has key {
    id: UID,
    event_type: u8,
    creator: address,
    created_at_ms: u64,
}

/// 참가 = (참가자 주소, 역할). soulbound(key-only) — 이전 불가.
/// 이 역할이 액션의 fold 방향을 결정한다(예: 하객→혼주 부조 엣지).
public struct Participation has key {
    id: UID,
    event_id: ID,
    participant: address,
    role_id: u8,
    created_at_ms: u64,
}

// === Events ===

public struct EventCreated has copy, drop {
    event_id: ID,
    event_type: u8,
    creator: address,
}

public struct Participated has copy, drop {
    event_id: ID,
    participant: address,
    role_id: u8,
}

// === Public functions ===

/// 이벤트를 만들어 공유하고, 생성자에게 자기 역할(권위 역할 포함, 예: 혼주/신청자) Participation을 발행한다.
/// 생성자 = 그 이벤트의 권위자. 참조용 event_id 반환.
public fun new_event(event_type: u8, creator_role_id: u8, clock: &Clock, ctx: &mut TxContext): ID {
    assert!(event_type <= EVENT_TYPE_MAX, EInvalidEventType);
    assert!(creator_role_id <= ROLE_MAX, EInvalidRole);
    let creator = ctx.sender();
    let ev = Event {
        id: object::new(ctx),
        event_type,
        creator,
        created_at_ms: clock.timestamp_ms(),
    };
    let event_id = object::id(&ev);
    event::emit(EventCreated { event_id, event_type, creator });
    transfer::share_object(ev);
    mint_participation(event_id, creator, creator_role_id, clock, ctx);
    event_id
}

/// 타인이 self-claimable 역할(하객 GUEST)로 참가 → 본인에게 soulbound Participation.
/// 권위 역할(혼주·주례)은 assign_role로만, 매칭 역할(신청자·수신자)은 ium 게이트 후 mint_participation_for로만(ENotSelfClaimable).
public fun participate(ev: &Event, role_id: u8, clock: &Clock, ctx: &mut TxContext): ID {
    assert!(role_id <= ROLE_MAX, EInvalidRole);
    assert!(is_self_claimable(role_id), ENotSelfClaimable);
    mint_participation(object::id(ev), ctx.sender(), role_id, clock, ctx)
}

/// 이벤트 생성자가 타인에게 임의 역할(공동 혼주·주례 등 권위 역할 포함)을 부여한다.
/// 자기 alts에 혼주를 멋대로 다는 것을 막는 1차 방어(§8 V4).
public fun assign_role(ev: &Event, to: address, role_id: u8, clock: &Clock, ctx: &mut TxContext): ID {
    assert!(ctx.sender() == ev.creator, ENotCreator);
    assert!(role_id <= ROLE_MAX, EInvalidRole);
    mint_participation(object::id(ev), to, role_id, clock, ctx)
}

// === Package-internal ===

/// 도메인 모듈(ium 등)이 자기 게이트(예: IumRequest 소유)를 통과시킨 뒤 비-self 역할(INITIATOR/RECEIVER)을
/// 대상에게 발행한다. self-claimable 우회의 정당성은 *호출 모듈의 게이트*가 책임진다(C-IUM1: stray RECEIVER 차단).
public(package) fun mint_participation_for(
    ev: &Event,
    to: address,
    role_id: u8,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(role_id <= ROLE_MAX, EInvalidRole);
    mint_participation(object::id(ev), to, role_id, clock, ctx)
}

// === Private ===

/// self-claimable = 자임해도 방향을 왜곡하지 않는 역할 = 하객(GUEST)만.
/// INITIATOR/RECEIVER는 매칭 게이트(IumRequest)가 있어야 정당 → self 금지(ium이 mint_participation_for로 발행).
fun is_self_claimable(role_id: u8): bool {
    role_id == ROLE_GUEST
}

fun mint_participation(event_id: ID, participant: address, role_id: u8, clock: &Clock, ctx: &mut TxContext): ID {
    let p = Participation {
        id: object::new(ctx),
        event_id,
        participant,
        role_id,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&p);
    event::emit(Participated { event_id, participant, role_id });
    transfer::transfer(p, participant);
    id
}

// === Views ===

public fun event_type(ev: &Event): u8 { ev.event_type }
public fun creator(ev: &Event): address { ev.creator }
public fun event_created_at_ms(ev: &Event): u64 { ev.created_at_ms }

public fun participation_event_id(p: &Participation): ID { p.event_id }
public fun participant(p: &Participation): address { p.participant }
public fun role_id(p: &Participation): u8 { p.role_id }

// === Constant accessors (다른 모듈·테스트가 쓰는 값) ===

public fun event_wedding(): u8 { EVENT_WEDDING }
public fun event_inyeon(): u8 { EVENT_INYEON }
public fun role_host(): u8 { ROLE_HOST }
public fun role_guest(): u8 { ROLE_GUEST }
public fun role_officiant(): u8 { ROLE_OFFICIANT }
public fun role_initiator(): u8 { ROLE_INITIATOR }
public fun role_receiver(): u8 { ROLE_RECEIVER }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const HOST: address = @0xA1;
#[test_only]
const GUEST: address = @0xB0;
#[test_only]
const OFFICIANT: address = @0xC0;
#[test_only]
const STRANGER: address = @0xD0;

#[test]
fun new_event_shares_and_mints_creator_role() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());

    let event_id = new_event(EVENT_WEDDING, ROLE_HOST, &clk, scenario.ctx());

    scenario.next_tx(HOST);
    let ev = scenario.take_shared<Event>();
    assert_eq!(object::id(&ev), event_id);
    assert_eq!(ev.event_type(), EVENT_WEDDING);
    assert_eq!(ev.creator(), HOST);
    // 생성자에게 혼주 Participation 발행됨.
    let p = scenario.take_from_sender<Participation>();
    assert_eq!(p.role_id(), ROLE_HOST);
    assert_eq!(p.participant(), HOST);
    assert_eq!(p.participation_event_id(), event_id);

    scenario.return_to_sender(p);
    ts::return_shared(ev);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
fun guest_self_participates() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    let event_id = new_event(EVENT_WEDDING, ROLE_HOST, &clk, scenario.ctx());

    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<Event>();
    participate(&ev, ROLE_GUEST, &clk, scenario.ctx());
    ts::return_shared(ev);

    scenario.next_tx(GUEST);
    let p = scenario.take_from_sender<Participation>();
    assert_eq!(p.role_id(), ROLE_GUEST);
    assert_eq!(p.participant(), GUEST);
    assert_eq!(p.participation_event_id(), event_id);

    scenario.return_to_sender(p);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test, expected_failure(abort_code = ENotSelfClaimable)]
fun guest_cannot_self_claim_host() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    new_event(EVENT_WEDDING, ROLE_HOST, &clk, scenario.ctx());

    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<Event>();
    participate(&ev, ROLE_HOST, &clk, scenario.ctx()); // 권위 역할 self 선언 → abort
    abort
}

#[test, expected_failure(abort_code = ENotSelfClaimable)]
fun cannot_self_claim_receiver() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    new_event(EVENT_INYEON, ROLE_INITIATOR, &clk, scenario.ctx());

    // 제3자가 IumRequest 없이 매칭 이벤트에 RECEIVER로 자임 → 차단(C-IUM1).
    scenario.next_tx(STRANGER);
    let ev = scenario.take_shared<Event>();
    participate(&ev, ROLE_RECEIVER, &clk, scenario.ctx());
    abort
}

#[test]
fun creator_assigns_officiant() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    let event_id = new_event(EVENT_WEDDING, ROLE_HOST, &clk, scenario.ctx());

    scenario.next_tx(HOST);
    let ev = scenario.take_shared<Event>();
    assign_role(&ev, OFFICIANT, ROLE_OFFICIANT, &clk, scenario.ctx());
    ts::return_shared(ev);

    scenario.next_tx(OFFICIANT);
    let p = scenario.take_from_sender<Participation>();
    assert_eq!(p.role_id(), ROLE_OFFICIANT);
    assert_eq!(p.participant(), OFFICIANT);
    assert_eq!(p.participation_event_id(), event_id);

    scenario.return_to_sender(p);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test, expected_failure(abort_code = ENotCreator)]
fun non_creator_cannot_assign_role() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    new_event(EVENT_WEDDING, ROLE_HOST, &clk, scenario.ctx());

    scenario.next_tx(STRANGER);
    let ev = scenario.take_shared<Event>();
    assign_role(&ev, STRANGER, ROLE_HOST, &clk, scenario.ctx()); // 생성자 아님 → abort
    abort
}
