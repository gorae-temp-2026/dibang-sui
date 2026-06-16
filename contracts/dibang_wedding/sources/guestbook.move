/// Guestbook 도메인 — 하객이 라운지에 남기는 방명록 항목을 소유 가능한
/// 오브젝트(NFT)로 구현한다. 작성 시 이벤트를 발행해 피드를 구성하고, 항목 자체는
/// 작성자가 보관하거나 다른 주소로 전달(claim)할 수 있는 축하 기념물이 된다.
module dibang_wedding::guestbook;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::WeddingLounge;
use dibang_wedding::utils;

// === Errors ===

/// 게스트 이름이 최대 글자 수를 초과함.
const EGuestNameTooLong: u64 = 0;
/// 메시지가 최대 글자 수를 초과함.
const EMessageTooLong: u64 = 1;

// === Constants ===

const MAX_GUEST_NAME_CHARS: u64 = 10;
const MAX_MESSAGE_CHARS: u64 = 200;

// === Structs ===

/// 방명록 항목. `key + store`라 소유·전송 가능한 NFT다.
public struct GuestbookEntry has key, store {
    id: UID,
    lounge_id: ID,
    author: address,
    guest_name: String,
    message: String,
    created_at: u64,
}

// === Events ===

public struct GuestbookEntryCreated has copy, drop {
    entry_id: ID,
    lounge_id: ID,
    author: address,
    guest_name: String,
    // 방명록 항목은 작성자별로 흩어진 owned NFT라, 라운지 단위 피드는 owned-object
    // 조회로 모을 수 없다. 따라서 이벤트가 메시지 본문까지 담아 피드를 이벤트만으로
    // 렌더링할 수 있게 한다.
    message: String,
}

public struct GuestbookEntryClaimed has copy, drop {
    entry_id: ID,
    recipient: address,
}

// === Public functions ===

/// 라운지에 방명록 항목을 작성한다. 생성된 `GuestbookEntry`를 반환하므로
/// PTB가 작성자에게 transfer 하거나 원하는 대로 합성할 수 있다.
public fun write_entry(
    lounge: &WeddingLounge,
    guest_name: String,
    message: String,
    clock: &Clock,
    ctx: &mut TxContext,
): GuestbookEntry {
    assert!(utils::utf8_char_count(&guest_name) <= MAX_GUEST_NAME_CHARS, EGuestNameTooLong);
    assert!(utils::utf8_char_count(&message) <= MAX_MESSAGE_CHARS, EMessageTooLong);

    let entry = GuestbookEntry {
        id: object::new(ctx),
        lounge_id: object::id(lounge),
        author: ctx.sender(),
        guest_name,
        message,
        created_at: clock.timestamp_ms(),
    };

    event::emit(GuestbookEntryCreated {
        entry_id: object::id(&entry),
        lounge_id: entry.lounge_id,
        author: entry.author,
        guest_name: entry.guest_name,
        message: entry.message,
    });

    entry
}

/// 방명록 항목을 지정한 주소로 전달한다(예: 작성자가 혼주에게 선물, 익명 작성분 회수).
public fun claim_entry(entry: GuestbookEntry, recipient: address) {
    event::emit(GuestbookEntryClaimed { entry_id: object::id(&entry), recipient });
    transfer::public_transfer(entry, recipient);
}

// === Views ===

public fun lounge_id(entry: &GuestbookEntry): ID { entry.lounge_id }
public fun author(entry: &GuestbookEntry): address { entry.author }
public fun guest_name(entry: &GuestbookEntry): String { entry.guest_name }
public fun message(entry: &GuestbookEntry): String { entry.message }
public fun created_at(entry: &GuestbookEntry): u64 { entry.created_at }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use dibang_wedding::wedding;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const GUEST: address = @0x6;

#[test_only]
/// 결혼식을 생성해 공유 라운지를 만들고, 다음 tx에서 라운지를 꺼낼 수 있게 한다.
fun setup_lounge(scenario: &mut ts::Scenario) {
    let cap = wedding::create_default_for_testing(scenario.ctx());
    transfer::public_transfer(cap, GUEST);
}

#[test]
fun write_entry_creates_and_emits() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    let entry = write_entry(
        &lounge,
        b"Hong".to_string(),
        b"Congratulations!".to_string(),
        &clock,
        scenario.ctx(),
    );

    assert_eq!(entry.guest_name, b"Hong".to_string());
    assert_eq!(entry.message, b"Congratulations!".to_string());
    assert_eq!(entry.author, GUEST);
    assert_eq!(entry.lounge_id, object::id(&lounge));

    transfer::public_transfer(entry, GUEST);
    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test]
fun claim_transfers_to_recipient() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());
    let entry = write_entry(&lounge, b"Hong".to_string(), b"Hi".to_string(), &clock, scenario.ctx());
    let entry_id = object::id(&entry);

    // @0xC1으로 전달
    claim_entry(entry, @0xC1);

    scenario.next_tx(@0xC1);
    let received = scenario.take_from_sender<GuestbookEntry>();
    assert_eq!(object::id(&received), entry_id);

    scenario.return_to_sender(received);
    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test, expected_failure(abort_code = EGuestNameTooLong)]
fun guest_name_too_long_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    // 11글자 > 10
    let entry = write_entry(&lounge, b"12345678901".to_string(), b"hi".to_string(), &clock, scenario.ctx());

    transfer::public_transfer(entry, GUEST);
    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}

#[test, expected_failure(abort_code = EMessageTooLong)]
fun message_too_long_fails() {
    let mut scenario = ts::begin(GUEST);
    setup_lounge(&mut scenario);

    scenario.next_tx(GUEST);
    let lounge = scenario.take_shared<WeddingLounge>();
    let clock = clock::create_for_testing(scenario.ctx());

    // 201글자 > 200 (ASCII 201개)
    let mut long = b"".to_string();
    let mut i = 0u64;
    while (i < 201) { long.append(b"a".to_string()); i = i + 1; };

    let entry = write_entry(&lounge, b"Hong".to_string(), long, &clock, scenario.ctx());

    transfer::public_transfer(entry, GUEST);
    clock::destroy_for_testing(clock);
    ts::return_shared(lounge);
    scenario.end();
}
