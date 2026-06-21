/// RSVP 도메인 — 모바일 청첩장의 참석 의사 응답을 온체인 이벤트로 남긴다.
/// 응답 건마다 오브젝트를 만들지 않고 `RsvpSubmitted` 이벤트만 발행해 가스를 아낀다.
/// 호스트는 이 이벤트를 조회해 측별 참석 현황을 집계한다.
///
/// §1-6(stringly-typed → u8 enum): slot/attendance/meal을 u8 코드로 받는다. 라벨↔코드 매핑은 오프체인(표시).
module dibang_wedding::rsvp;

use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::{Self, WeddingLounge};

// === Errors ===

/// attendance 코드가 0(attending)/1(absent) 범위 밖.
const EInvalidAttendance: u64 = 0;
/// 동반 인원이 허용 범위를 초과함.
const ETooManyCompanions: u64 = 1;
/// meal 코드가 0(yes)/1(no)/2(undecided) 범위 밖.
const EInvalidMeal: u64 = 2;

// === Constants ===

const MAX_COMPANIONS: u64 = 20;
/// attendance: attending=0, absent=1.
const ATTENDANCE_MAX: u8 = 1;
/// meal: yes=0, no=1, undecided=2.
const MEAL_MAX: u8 = 2;

// === Events ===

/// 참석 의사 — 신원은 `submitter`(지갑 주소)로만. 이름 등 PII는 온체인에 담지 않는다(결정#2/§3).
/// 호스트는 submitter 주소 → 이름을 *오프체인*에서 매핑해 현황을 본다(신원-불가지 원칙).
/// slot/attendance/meal은 u8 코드(§1-6) — 라벨은 오프체인.
public struct RsvpSubmitted has copy, drop {
    wedding_id: ID,
    submitter: address,
    recipient_slot: u8,
    attendance: u8,
    companion_count: u64,
    meal: u8,
    submitted_at: u64,
}

// === Public functions ===

/// 참석 의사를 제출한다. 검증을 통과하면 `RsvpSubmitted` 이벤트를 발행한다.
/// recipient_slot(0~5)·attendance(0~1)·meal(0~2)는 u8 코드(라벨은 오프체인).
public fun submit_rsvp(
    lounge: &WeddingLounge,
    recipient_slot: u8,
    attendance: u8,
    companion_count: u64,
    meal: u8,
    clock: &Clock,
    ctx: &TxContext,
) {
    wedding::assert_valid_recipient_slot(recipient_slot);
    assert!(attendance <= ATTENDANCE_MAX, EInvalidAttendance);
    assert!(companion_count <= MAX_COMPANIONS, ETooManyCompanions);
    assert!(meal <= MEAL_MAX, EInvalidMeal);

    event::emit(RsvpSubmitted {
        wedding_id: wedding::lounge_wedding_id(lounge),
        submitter: ctx.sender(),
        recipient_slot,
        attendance,
        companion_count,
        meal,
        submitted_at: clock.timestamp_ms(),
    });
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const GUEST: address = @0x6;

#[test_only]
/// 결혼식을 생성해 공유 라운지를 만든다 (Cap은 GUEST에게 전달, RSVP 자체엔 불필요).
fun setup_lounge(scenario: &mut ts::Scenario) {
    wedding::create_default_for_testing(scenario.ctx()); // cap → sender 내부 transfer(key-only, rsvp 미사용)
}

#[test]
fun submit_emits_one_event() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    // groom(0), attending(0), meal yes(0).
    submit_rsvp(&lounge, 0, 0, 2, 0, &clock, scenario.ctx());

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);

    // tx 커밋 후 발행된 user event 수를 확인.
    let effects = scenario.next_tx(GUEST);
    assert_eq!(effects.num_user_events(), 1);
    scenario.end();
}

#[test, expected_failure(abort_code = EInvalidAttendance)]
fun invalid_attendance_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    submit_rsvp(&lounge, 0, 2, 0, 0, &clock, scenario.ctx()); // attendance=2 범위 밖

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test, expected_failure(abort_code = ETooManyCompanions)]
fun too_many_companions_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    submit_rsvp(&lounge, 0, 0, 21, 0, &clock, scenario.ctx()); // companions > 20

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test, expected_failure(abort_code = EInvalidMeal)]
fun invalid_meal_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    submit_rsvp(&lounge, 0, 0, 0, 3, &clock, scenario.ctx()); // meal=3 범위 밖

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test, expected_failure]
fun invalid_slot_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    submit_rsvp(&lounge, 6, 0, 0, 0, &clock, scenario.ctx()); // slot=6 범위 밖

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}
