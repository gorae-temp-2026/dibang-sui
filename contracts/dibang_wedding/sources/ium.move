/// Ium(이음) 도메인 — 인연 매칭을 온체인으로 구현한다.
///
/// 설계(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION §3-F·§4, opus 진단 #1):
/// - **매칭 = 관계 형성 = 이벤트 자체**다. inyeon 매칭 = `gathering::Event(INYEON)` + 양측 Participation
///   (신청자 INITIATOR · 수신자 RECEIVER). 이 둘이 곧 CS(이음) 엣지 신호 — 인덱서가 도출한다.
///   매칭 자체엔 별도 ActionRecord가 불필요(이벤트 안의 후속 액션(선물·대화)만 원장에 남는다).
/// - **전역 `IumRegistry` 제거**(진단 #1: 모든 관계 생성을 단일 shared object에 직렬화 → 병렬성 말살).
///   유니크는 per-node(신청자 Moi)로 후행 — 중복은 raw-permissive, Φ가 거른다(§2-8).
/// - **PII 제거**: relation_type·label(사람 관계 정보) 온체인 X(결정#2). 한마디·프로필은 오프체인.
/// - request→accept 핸드오프: `IumRequest`를 수신자에게 transfer → *소유가 곧 수락 권한*(게이트).
module dibang_wedding::ium;

use sui::clock::Clock;
use sui::event;
use dibang_wedding::event as gathering;
use dibang_wedding::signal;

// === Errors ===

/// 자기 자신과는 이음할 수 없음.
const ESelfLink: u64 = 0;
/// 수락 시 제시한 Event가 IumRequest의 매칭 Event가 아님.
const EWrongEvent: u64 = 1;

// === Structs ===

/// 대기 중인 이음 신청. 수신자에게 transfer되어, 그 소유가 곧 수락 권한이다(key-only — 양도 불가).
/// `event_id` = 이 매칭의 inyeon Event(gathering::Event, EVENT_INYEON). 한마디 등 콘텐츠는 오프체인.
public struct IumRequest has key {
    id: UID,
    event_id: ID,
    initiator: address,
    created_at: u64,
}

// === Events ===

public struct IumRequested has copy, drop {
    event_id: ID,
    initiator: address,
    to_user: address,
}

public struct IumAccepted has copy, drop {
    event_id: ID,
    initiator: address,
    receiver: address,
}

// === Public functions ===

/// 이음 신청 — 매칭 Event(INYEON)를 생성하고(신청자=INITIATOR Participation 발행) `IumRequest`를
/// `to_user`에게 전달한다. 매칭 Event id 반환. 한마디·프로필은 오프체인.
public fun request_ium(to_user: address, clock: &Clock, ctx: &mut TxContext): ID {
    let initiator = ctx.sender();
    assert!(initiator != to_user, ESelfLink);

    // 매칭 이벤트 생성 — 신청자가 그 이벤트의 INITIATOR(자기 Participation 발행).
    let event_id = gathering::new_event(gathering::event_inyeon(), gathering::role_initiator(), clock, ctx);

    let req = IumRequest {
        id: object::new(ctx),
        event_id,
        initiator,
        created_at: clock.timestamp_ms(),
    };
    event::emit(IumRequested { event_id, initiator, to_user });
    transfer::transfer(req, to_user);
    event_id
}

/// 이음 수락 — 수신자가 자기 소유 `IumRequest` + 매칭 Event로 RECEIVER로 참가해 매칭을 확정한다.
/// 확정된 매칭 = INYEON Event + 양측 Participation(INITIATOR/RECEIVER) = CS 엣지(인덱서가 도출).
public fun accept_ium(ev: &gathering::Event, req: IumRequest, clock: &Clock, ctx: &mut TxContext) {
    let receiver = ctx.sender();
    let IumRequest { id, event_id, initiator, created_at: _ } = req;
    assert!(object::id(ev) == event_id, EWrongEvent);

    // 수신자가 매칭 이벤트에 RECEIVER로 참가(soulbound Participation). IumRequest 소유가 게이트이므로
    // self-claimable participate가 아니라 패키지-내부 mint로 발행한다(C-IUM1: 제3자 RECEIVER 자임 차단).
    gathering::mint_participation_for(ev, receiver, gathering::role_receiver(), clock, ctx);

    // 매칭 확정 = 상호 관계 → 양방향 CS(initiator↔receiver) 온체인 분류·발행(인덱서/credit.ts·DeFi 입력).
    let sigs = signal::match_signals(initiator, receiver);
    signal::emit_signals(&sigs, event_id, clock);

    event::emit(IumAccepted { event_id, initiator, receiver });
    id.delete();
}

// === Views ===

public fun request_event_id(req: &IumRequest): ID { req.event_id }
public fun request_initiator(req: &IumRequest): address { req.initiator }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const ALICE: address = @0xA1; // initiator
#[test_only]
const BOB: address = @0xB0; // receiver

#[test]
fun request_creates_inyeon_event_and_request() {
    let mut scenario = ts::begin(ALICE);
    let clk = clock::create_for_testing(scenario.ctx());

    let event_id = request_ium(BOB, &clk, scenario.ctx());

    // 매칭 INYEON 이벤트가 공유되고, 신청자에게 INITIATOR Participation, 수신자에게 IumRequest.
    scenario.next_tx(ALICE);
    let ev = scenario.take_shared<gathering::Event>();
    assert_eq!(object::id(&ev), event_id);
    assert_eq!(ev.event_type(), gathering::event_inyeon());
    let p_init = scenario.take_from_sender<gathering::Participation>();
    assert_eq!(p_init.role_id(), gathering::role_initiator());
    assert_eq!(p_init.participant(), ALICE);

    scenario.return_to_sender(p_init);
    ts::return_shared(ev);

    scenario.next_tx(BOB);
    let req = scenario.take_from_sender<IumRequest>();
    assert_eq!(req.request_event_id(), event_id);
    assert_eq!(req.request_initiator(), ALICE);
    scenario.return_to_sender(req);

    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
fun accept_confirms_match_with_both_participations() {
    let mut scenario = ts::begin(ALICE);
    let clk = clock::create_for_testing(scenario.ctx());
    let event_id = request_ium(BOB, &clk, scenario.ctx());

    // 수신자(BOB)가 수락 → RECEIVER로 참가, IumRequest 소비.
    scenario.next_tx(BOB);
    let ev = scenario.take_shared<gathering::Event>();
    let req = scenario.take_from_sender<IumRequest>();
    accept_ium(&ev, req, &clk, scenario.ctx());
    ts::return_shared(ev);

    // BOB에게 RECEIVER Participation(매칭 확정 = 양측 참가).
    scenario.next_tx(BOB);
    let p_recv = scenario.take_from_sender<gathering::Participation>();
    assert_eq!(p_recv.role_id(), gathering::role_receiver());
    assert_eq!(p_recv.participation_event_id(), event_id);
    assert_eq!(p_recv.participant(), BOB);
    scenario.return_to_sender(p_recv);

    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test, expected_failure(abort_code = ESelfLink)]
fun self_link_fails() {
    let mut scenario = ts::begin(ALICE);
    let clk = clock::create_for_testing(scenario.ctx());
    request_ium(ALICE, &clk, scenario.ctx()); // 자기 자신 → ESelfLink
    abort
}

#[test, expected_failure(abort_code = EWrongEvent)]
fun accept_wrong_event_fails() {
    let mut scenario = ts::begin(ALICE);
    let clk = clock::create_for_testing(scenario.ctx());
    request_ium(BOB, &clk, scenario.ctx()); // 매칭 X: req는 BOB에게

    // ALICE가 다른 매칭 Y 생성(req는 @0xC1에게).
    scenario.next_tx(ALICE);
    let other_event_id = request_ium(@0xC1, &clk, scenario.ctx());

    // BOB이 자기 req(매칭 X)로 엉뚱한 Event Y를 들이밀어 수락 시도 → EWrongEvent.
    scenario.next_tx(BOB);
    let other_ev = scenario.take_shared_by_id<gathering::Event>(other_event_id);
    let req = scenario.take_from_sender<IumRequest>();
    accept_ium(&other_ev, req, &clk, scenario.ctx());
    abort
}
