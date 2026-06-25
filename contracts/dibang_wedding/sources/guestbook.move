/// Guestbook 도메인 — 방명록 작성을 *신뢰 신호* + 메시지 본문으로 기록한다.
///
/// write: 신호만(본문 없음, 하위 호환). write_message: 신호 + 메시지 본문 온체인 저장.
/// write_message의 message/guest_name 필드는 이미 Walrus blobId로 사용 중(SDK에서 변환).
module dibang_wedding::guestbook;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::{Self, Wedding};
use dibang_wedding::ledger;
use dibang_wedding::trust_matrix;
use dibang_wedding::event as gathering;

// === Errors ===

const EWrongEvent: u64 = 0;
const EEmptyMessage: u64 = 1;

// === Structs ===

/// 방명록 메시지. soulbound — 작성자에 귀속.
/// message/guest_name은 Walrus blobId로 사용(SDK에서 평문→Walrus→blobId 변환).
public struct GuestbookMessage has key {
    id: UID,
    wedding_id: ID,
    author: address,
    guest_name: String,
    message: String,
    recipient_slot: u8,
    created_at_ms: u64,
}

// === Events ===

public struct GuestbookMessageCreated has copy, drop {
    message_id: ID,
    wedding_id: ID,
    author: address,
    guest_name: String,
    message: String,
    recipient_slot: u8,
    created_at_ms: u64,
}

// === Public functions ===

/// 방명록 작성 (신호만, 본문 없음 — 하위 호환).
public fun write(
    wedding: &Wedding,
    participation: &gathering::Participation,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(gathering::participation_event_id(participation) == wedding::event_id(wedding), EWrongEvent);
    let host = wedding::primary_host(wedding);
    ledger::log(participation, ledger::action_write_message(), option::some(host), 0, option::none(), matrix, clock, ctx)
}

/// 방명록 작성 + 메시지 본문 온체인 저장. 신호 기록 + GuestbookMessage soulbound 발행.
/// message/guest_name은 Walrus blobId(SDK에서 변환). 타입은 String(blobId 호환).
public fun write_message(
    wedding: &Wedding,
    participation: &gathering::Participation,
    guest_name: String,
    message: String,
    recipient_slot: u8,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(gathering::participation_event_id(participation) == wedding::event_id(wedding), EWrongEvent);
    assert!(message.length() > 0, EEmptyMessage);
    wedding::assert_valid_recipient_slot(recipient_slot);

    let host = wedding::primary_host(wedding);
    ledger::log(participation, ledger::action_write_message(), option::some(host), 0, option::none(), matrix, clock, ctx);

    let wid = object::id(wedding);
    let msg = GuestbookMessage {
        id: object::new(ctx),
        wedding_id: wid,
        author: ctx.sender(),
        guest_name,
        message,
        recipient_slot,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&msg);
    event::emit(GuestbookMessageCreated {
        message_id: id,
        wedding_id: wid,
        author: msg.author,
        guest_name: msg.guest_name,
        message: msg.message,
        recipient_slot,
        created_at_ms: msg.created_at_ms,
    });
    transfer::transfer(msg, ctx.sender());
    id
}

// === Views ===

public fun guestbook_message_wedding_id(m: &GuestbookMessage): ID { m.wedding_id }
public fun guestbook_message_author(m: &GuestbookMessage): address { m.author }
public fun guestbook_message_text(m: &GuestbookMessage): String { m.message }
public fun guestbook_message_guest_name(m: &GuestbookMessage): String { m.guest_name }
public fun guestbook_message_slot(m: &GuestbookMessage): u8 { m.recipient_slot }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const HOST: address = @0xA;
#[test_only]
const GUEST: address = @0x6;

#[test]
fun write_logs_message_action() {
    let mut scenario = ts::begin(HOST);
    // 혼주가 결혼식 생성(Event 포함). Cap은 HOST에게.
    wedding::create_default_for_testing(scenario.ctx()); // cap → sender(HOST) 내부 transfer(key-only)

    // 하객이 결혼식 이벤트에 GUEST로 참가.
    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<gathering::Event>();
    let clk0 = clock::create_for_testing(scenario.ctx());
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk0, scenario.ctx());
    destroy(cs_mtx);
    clock::destroy_for_testing(clk0);
    ts::return_shared(ev);

    // 하객이 방명록 작성 → WRITE_MESSAGE 신호 기록(본문 미저장).
    scenario.next_tx(GUEST);
    let wedding = scenario.take_shared<Wedding>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    let clk = clock::create_for_testing(scenario.ctx());
    let rec_id = write(&wedding, &part, &mut mtx, &clk, scenario.ctx());
    // 배선 검증: 방명록 CS가 매트릭스에 반영(받는 쪽 HOST authority↑).
    assert_eq!(trust_matrix::pi_of(&mtx, HOST), 138_750_000);
    destroy(mtx);
    clock::destroy_for_testing(clk);
    scenario.return_to_sender(part);
    ts::return_shared(wedding);

    scenario.next_tx(GUEST);
    let rec = scenario.take_from_sender_by_id<ledger::ActionRecord>(rec_id);
    assert_eq!(rec.action_type(), ledger::action_write_message());
    assert_eq!(rec.actor(), GUEST);
    assert_eq!(rec.record_role_id(), gathering::role_guest());
    assert_eq!(rec.target(), option::some(HOST));
    assert_eq!(rec.amount(), 0);
    scenario.return_to_sender(rec);
    scenario.end();
}
