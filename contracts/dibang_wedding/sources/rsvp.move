/// RSVP 도메인 — 모바일 청첩장의 참석 의사 응답을 온체인 이벤트로 남긴다.
/// 응답 건마다 오브젝트를 만들지 않고 `RsvpSubmitted` 이벤트만 발행해 가스를 아낀다.
/// 호스트는 이 이벤트를 조회해 측별 참석 현황을 집계한다.
module dibang_wedding::rsvp;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::{Self, WeddingLounge};
use dibang_wedding::utils;

// === Errors ===

/// 게스트 이름이 최대 글자 수를 초과함.
const EGuestNameTooLong: u64 = 0;
/// attendance 값이 'attending' / 'absent' 가 아님.
const EInvalidAttendance: u64 = 1;
/// 동반 인원이 허용 범위를 초과함.
const ETooManyCompanions: u64 = 2;
/// meal 값이 'yes' / 'no' / 'undecided' 가 아님.
const EInvalidMeal: u64 = 3;

// === Constants ===

const MAX_GUEST_NAME_CHARS: u64 = 20;
const MAX_COMPANIONS: u64 = 20;

// === Events ===

public struct RsvpSubmitted has copy, drop {
    wedding_id: ID,
    submitter: address,
    recipient_slot: String,
    guest_name: String,
    attendance: String,
    companion_count: u64,
    meal: String,
    submitted_at: u64,
}

// === Public functions ===

/// 참석 의사를 제출한다. 검증을 통과하면 `RsvpSubmitted` 이벤트를 발행한다.
public fun submit_rsvp(
    lounge: &WeddingLounge,
    recipient_slot: String,
    guest_name: String,
    attendance: String,
    companion_count: u64,
    meal: String,
    clock: &Clock,
    ctx: &TxContext,
) {
    wedding::assert_valid_recipient_slot(&recipient_slot);
    assert!(utils::utf8_char_count(&guest_name) <= MAX_GUEST_NAME_CHARS, EGuestNameTooLong);
    assert!(is_valid_attendance(&attendance), EInvalidAttendance);
    assert!(companion_count <= MAX_COMPANIONS, ETooManyCompanions);
    assert!(is_valid_meal(&meal), EInvalidMeal);

    event::emit(RsvpSubmitted {
        wedding_id: wedding::lounge_wedding_id(lounge),
        submitter: ctx.sender(),
        recipient_slot,
        guest_name,
        attendance,
        companion_count,
        meal,
        submitted_at: clock.timestamp_ms(),
    });
}

// === Validation helpers ===

fun is_valid_attendance(s: &String): bool {
    let b = *s.as_bytes();
    b == b"attending" || b == b"absent"
}

fun is_valid_meal(s: &String): bool {
    let b = *s.as_bytes();
    b == b"yes" || b == b"no" || b == b"undecided"
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
    let cap = wedding::create_default_for_testing(scenario.ctx());
    transfer::public_transfer(cap, GUEST);
}

#[test]
fun submit_emits_one_event() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    submit_rsvp(
        &lounge,
        b"groom".to_string(),
        b"Hong".to_string(),
        b"attending".to_string(),
        2,
        b"yes".to_string(),
        &clock,
        scenario.ctx(),
    );

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

    submit_rsvp(
        &lounge,
        b"groom".to_string(),
        b"Hong".to_string(),
        b"maybe".to_string(), // 잘못된 값
        0,
        b"yes".to_string(),
        &clock,
        scenario.ctx(),
    );

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

    submit_rsvp(
        &lounge,
        b"groom".to_string(),
        b"Hong".to_string(),
        b"attending".to_string(),
        21, // > 20
        b"yes".to_string(),
        &clock,
        scenario.ctx(),
    );

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

    submit_rsvp(
        &lounge,
        b"groom".to_string(),
        b"Hong".to_string(),
        b"attending".to_string(),
        0,
        b"maybe".to_string(), // 잘못된 값
        &clock,
        scenario.ctx(),
    );

    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}
