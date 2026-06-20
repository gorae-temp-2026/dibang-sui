/// Wedding 도메인 — 결혼식의 *익명 앵커*(`Wedding`), 혼주 수정 권한(`WeddingCap`),
/// 하객 라운지(`WeddingLounge`)를 정의한다.
///
/// **결정#2(신원-불가지): 온체인 Wedding은 이름·예식장 등 표시 콘텐츠를 담지 않는다.**
/// 신랑·신부·부모 이름, 날짜·시간·예식장, 라운지 이름 등 *사람/표시 정보는 전부 오프체인*(Supabase)에
/// `wedding_id`/`event_id`로 키잉해 보관한다. 온체인엔 신뢰 그래프 앵커만 남긴다:
/// event_id(이 결혼식을 관통하는 gathering::Event), 혼주 지갑 주소들, status, 모금함 ID.
///
/// 다른 모듈(guestbook, cash_gift, rsvp)이 이 모듈의 타입과 혼주 슬롯 검증을 재사용한다.
module dibang_wedding::wedding;

use std::string::String;
use sui::clock::Clock;
use sui::event;
// 도메인 이벤트 모듈은 프레임워크 sui::event와 이름이 겹쳐 gathering으로 alias.
use dibang_wedding::event as gathering;
use dibang_wedding::ledger;

// === Errors ===

/// Cap이 가리키는 결혼식과 대상 결혼식이 일치하지 않음.
const EWrongCap: u64 = 0;
/// 호스트 슬롯이 가득 참 (최대 6명).
const EMaxHostsReached: u64 = 1;
/// 이미 등록된 호스트 주소를 다시 추가하려 함.
const EHostAlreadyExists: u64 = 2;
/// 혼주 슬롯 값이 정해진 6종 중 하나가 아님.
const EInvalidRecipientSlot: u64 = 3;
/// 이미 모금함이 연결된 결혼식에 또 연결하려 함.
const EVaultAlreadySet: u64 = 4;
/// 초대 시 제시한 Participation이 이 결혼식의 이벤트가 아님.
const EWrongEvent: u64 = 5;
/// 초대는 혼주(HOST 역할)만 가능.
const ENotHost: u64 = 6;

// === Constants ===

/// 호스트(혼주) 최대 인원: 신랑·신부·양가 부모 6명.
const MAX_HOSTS: u64 = 6;

// === Structs ===

/// 결혼식의 *익명 앵커*. 공유 오브젝트라 누구나 조회 가능, 수정은 `WeddingCap` 보유자만.
/// 이름·예식장 등 표시 콘텐츠는 *온체인에 없다*(결정#2) — 오프체인에서 wedding_id로 키잉.
public struct Wedding has key {
    id: UID,
    // 이 결혼식을 관통하는 신뢰 그래프 이벤트(gathering::Event, EVENT_WEDDING). 부조 등 액션의 event_id.
    event_id: ID,
    status: String,
    host_addresses: vector<address>,
    // 이 결혼식의 축의금 모금함(CashGiftVault) ID. cash_gift::create_vault 가 1회 채운다.
    vault_id: Option<ID>,
}

/// 결혼식 수정 권한 증명. 생성자(첫 호스트)에게 전달된다.
public struct WeddingCap has key, store {
    id: UID,
    wedding_id: ID,
}

/// 하객이 모이는 라운지. `Wedding`과 1:1이며 공유 오브젝트다. 표시 이름은 오프체인(결정#2).
public struct WeddingLounge has key {
    id: UID,
    wedding_id: ID,
}

// === Events ===

public struct WeddingCreated has copy, drop {
    wedding_id: ID,
    event_id: ID,
    lounge_id: ID,
}

public struct HostAdded has copy, drop {
    wedding_id: ID,
    host: address,
}

// === Public functions ===

/// 결혼식을 생성한다(익명 앵커). 호출자가 첫 호스트가 되며, `Wedding`과 `WeddingLounge`는
/// 공유 오브젝트로 등록된다. 표시 정보(이름·예식장 등)는 *온체인에 받지 않는다* — 오프체인에서
/// 반환된 wedding_id/event_id로 키잉해 저장한다. 생성된 `WeddingCap`은 반환(PTB가 transfer).
public fun create_wedding(clock: &Clock, ctx: &mut TxContext): WeddingCap {
    // 이 결혼식을 관통하는 이벤트 생성(생성자=혼주, ROLE_HOST Participation도 발행). 부조의 event_id가 된다.
    let event_id = gathering::new_event(gathering::event_wedding(), gathering::role_host(), clock, ctx);
    let wedding = Wedding {
        id: object::new(ctx),
        event_id,
        status: b"active".to_string(),
        host_addresses: vector[ctx.sender()],
        vault_id: option::none(),
    };
    let wedding_id = object::id(&wedding);

    let lounge = WeddingLounge { id: object::new(ctx), wedding_id };
    let lounge_id = object::id(&lounge);

    let cap = WeddingCap { id: object::new(ctx), wedding_id };

    event::emit(WeddingCreated { wedding_id, event_id, lounge_id });

    transfer::share_object(wedding);
    transfer::share_object(lounge);
    cap
}

/// 호스트(혼주)를 추가한다. 최대 6명, 중복 불가.
public fun add_host(wedding: &mut Wedding, cap: &WeddingCap, new_host: address) {
    assert!(cap.wedding_id == object::id(wedding), EWrongCap);
    assert!(wedding.host_addresses.length() < MAX_HOSTS, EMaxHostsReached);
    assert!(!wedding.host_addresses.contains(&new_host), EHostAlreadyExists);

    wedding.host_addresses.push_back(new_host);
    event::emit(HostAdded { wedding_id: object::id(wedding), host: new_host });
}

/// 초대(청첩장) — 혼주가 하객을 초대했다는 *사전 관계 신호*(CS○★, "디방의 본질")를 원장에 기록한다.
/// `host_participation`은 이 결혼식의 HOST 역할이어야 하고, `guest`는 초대한 하객 주소(이름·연락처는 오프체인).
/// 방향(혼주→하객)·event는 participation에서 파생. 원장 레코드 ID 반환.
public fun invite(
    wedding: &Wedding,
    host_participation: &gathering::Participation,
    guest: address,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(gathering::participation_event_id(host_participation) == wedding.event_id, EWrongEvent);
    assert!(gathering::role_id(host_participation) == gathering::role_host(), ENotHost);
    ledger::log(host_participation, ledger::action_invite(), option::some(guest), 0, option::none(), clock, ctx)
}

// === Recipient slot 검증 (cash_gift, rsvp 가 재사용) ===

/// 혼주 슬롯이 정해진 6종(신랑/신부/양가 부모) 중 하나인지 검사한다. (슬롯=어느 측 카테고리, PII 아님.)
public fun is_valid_recipient_slot(slot: &String): bool {
    let b = *slot.as_bytes();
    b == b"groom" || b == b"bride"
        || b == b"groom_father" || b == b"groom_mother"
        || b == b"bride_father" || b == b"bride_mother"
}

/// 혼주 슬롯이 유효하지 않으면 abort 한다.
public fun assert_valid_recipient_slot(slot: &String) {
    assert!(is_valid_recipient_slot(slot), EInvalidRecipientSlot);
}

// === Vault 연결 (cash_gift 모듈 전용) ===

/// 결혼식에 축의금 모금함을 1회만 연결한다(중복 모금함 방지). 패키지 내부에서만 호출.
public(package) fun set_vault(wedding: &mut Wedding, vault_id: ID) {
    assert!(wedding.vault_id.is_none(), EVaultAlreadySet);
    wedding.vault_id = option::some(vault_id);
}

// === Views ===

/// Cap이 가리키는 결혼식 ID.
public fun wedding_id(cap: &WeddingCap): ID { cap.wedding_id }

/// 라운지가 속한 결혼식 ID.
public fun lounge_wedding_id(lounge: &WeddingLounge): ID { lounge.wedding_id }

/// 현재 호스트 주소 목록(복사본).
public fun hosts(wedding: &Wedding): vector<address> { wedding.host_addresses }

/// 결혼식 상태.
public fun status(wedding: &Wedding): String { wedding.status }

/// 연결된 축의금 모금함 ID(없으면 none).
public fun vault_id(wedding: &Wedding): Option<ID> { wedding.vault_id }

/// 이 결혼식을 관통하는 신뢰 그래프 이벤트 ID(gathering::Event). 부조 등 액션의 event_id.
public fun event_id(wedding: &Wedding): ID { wedding.event_id }

/// 첫 호스트(생성자=혼주). 부조의 대상(target) 기본값. host_addresses는 생성 시 [sender]로 ≥1 보장.
public fun primary_host(wedding: &Wedding): address { *wedding.host_addresses.borrow(0) }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const HOST: address = @0xA;

#[test_only]
/// 결혼식을 생성하고 `WeddingCap`을 반환한다(앵커만 — 표시 정보 인자 없음). 다른 모듈 테스트에서도 재사용.
public fun create_default_for_testing(ctx: &mut TxContext): WeddingCap {
    // 시그니처 파급 0: 내부에서 test clock을 만들어 create_wedding에 넘기고 파기. 호출처(rsvp·cash_gift·guestbook·gift·integration) 무수정.
    let clk = sui::clock::create_for_testing(ctx);
    let cap = create_wedding(&clk, ctx);
    sui::clock::destroy_for_testing(clk);
    cap
}

#[test_only]
/// 임의의 wedding_id를 가리키는 `WeddingCap`을 만든다. 잘못된 Cap 권한 거부(EWrongCap) 테스트용.
public fun new_cap_for_testing(wedding_id: ID, ctx: &mut TxContext): WeddingCap {
    WeddingCap { id: object::new(ctx), wedding_id }
}

#[test_only]
/// 결혼식을 생성하고 Cap을 호출자(sender)에게 전달한다 (wedding 모듈 자체 테스트용).
fun new_wedding_for_test(scenario: &mut ts::Scenario) {
    let sender = scenario.ctx().sender();
    let cap = create_default_for_testing(scenario.ctx());
    transfer::public_transfer(cap, sender);
}

#[test]
fun create_shares_wedding_lounge_and_cap() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let wedding = scenario.take_shared<Wedding>();
    let lounge = scenario.take_shared<WeddingLounge>();
    let cap = scenario.take_from_sender<WeddingCap>();

    // 앵커: status·혼주 주소만(표시 콘텐츠는 온체인에 없음).
    assert_eq!(wedding.status, b"active".to_string());
    assert_eq!(wedding.host_addresses.length(), 1);
    let host = HOST;
    assert!(wedding.host_addresses.contains(&host));
    // Cap·Lounge 모두 같은 결혼식을 가리켜야 한다.
    assert_eq!(cap.wedding_id, object::id(&wedding));
    assert_eq!(lounge.wedding_id, object::id(&wedding));

    ts::return_shared(wedding);
    ts::return_shared(lounge);
    scenario.return_to_sender(cap);
    scenario.end();
}

#[test]
fun create_links_event() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let wedding = scenario.take_shared<Wedding>();
    // 결혼식이 만든 이벤트가 공유됐고 WEDDING 타입이며, wedding.event_id가 그것을 가리킨다(§4 resolve 불변식).
    let ev = scenario.take_shared<gathering::Event>();
    assert_eq!(wedding.event_id(), object::id(&ev));
    assert_eq!(ev.event_type(), gathering::event_wedding());
    // 혼주에게 ROLE_HOST Participation 발행됨(부조 방향의 target 근거).
    let part = scenario.take_from_sender<gathering::Participation>();
    assert_eq!(part.role_id(), gathering::role_host());
    assert_eq!(part.participation_event_id(), wedding.event_id());

    scenario.return_to_sender(part);
    ts::return_shared(ev);
    ts::return_shared(wedding);
    scenario.end();
}

#[test]
fun invite_logs_host_to_guest() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let wedding = scenario.take_shared<Wedding>();
    // 혼주는 create_wedding(new_event)에서 HOST Participation을 받았다.
    let host_part = scenario.take_from_sender<gathering::Participation>();
    let clk = sui::clock::create_for_testing(scenario.ctx());
    let rec_id = invite(&wedding, &host_part, @0x6171, &clk, scenario.ctx());
    sui::clock::destroy_for_testing(clk);
    scenario.return_to_sender(host_part);
    ts::return_shared(wedding);

    scenario.next_tx(HOST);
    let rec = scenario.take_from_sender_by_id<ledger::ActionRecord>(rec_id);
    assert_eq!(rec.action_type(), ledger::action_invite());
    assert_eq!(rec.actor(), HOST);
    assert_eq!(rec.record_role_id(), gathering::role_host()); // 혼주→하객 방향
    assert_eq!(rec.target(), option::some(@0x6171));
    scenario.return_to_sender(rec);
    scenario.end();
}

#[test]
fun add_host_appends() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    let cap = scenario.take_from_sender<WeddingCap>();

    add_host(&mut wedding, &cap, @0xB);
    assert_eq!(wedding.host_addresses.length(), 2);
    assert!(wedding.host_addresses.contains(&@0xB));

    ts::return_shared(wedding);
    scenario.return_to_sender(cap);
    scenario.end();
}

#[test]
fun recipient_slot_validation() {
    assert!(is_valid_recipient_slot(&b"groom".to_string()));
    assert!(is_valid_recipient_slot(&b"bride_mother".to_string()));
    assert!(!is_valid_recipient_slot(&b"uncle".to_string()));
}

#[test, expected_failure(abort_code = EInvalidRecipientSlot)]
fun invalid_recipient_slot_aborts() {
    assert_valid_recipient_slot(&b"uncle".to_string());
}

#[test, expected_failure(abort_code = EWrongCap)]
fun add_host_with_wrong_cap_fails() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    // 다른 결혼식을 가리키는 가짜 Cap (같은 모듈이라 직접 생성 가능).
    let fake_cap = WeddingCap {
        id: object::new(scenario.ctx()),
        wedding_id: object::id_from_address(@0xBEEF),
    };

    add_host(&mut wedding, &fake_cap, @0xB); // EWrongCap 으로 abort

    // 아래는 컴파일 위한 소비 — 런타임엔 위에서 abort되어 도달하지 않음.
    let WeddingCap { id, wedding_id: _ } = fake_cap;
    id.delete();
    ts::return_shared(wedding);
    scenario.end();
}

#[test, expected_failure(abort_code = EMaxHostsReached)]
fun add_host_beyond_max_fails() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    let cap = scenario.take_from_sender<WeddingCap>();

    // 시작 1명 + 5명 = 6명(최대). 6번째 추가에서 abort.
    add_host(&mut wedding, &cap, @0x1);
    add_host(&mut wedding, &cap, @0x2);
    add_host(&mut wedding, &cap, @0x3);
    add_host(&mut wedding, &cap, @0x4);
    add_host(&mut wedding, &cap, @0x5);
    add_host(&mut wedding, &cap, @0x6); // EMaxHostsReached

    ts::return_shared(wedding);
    scenario.return_to_sender(cap);
    scenario.end();
}

#[test, expected_failure(abort_code = EVaultAlreadySet)]
fun set_vault_twice_fails() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    set_vault(&mut wedding, object::id_from_address(@0x1));
    set_vault(&mut wedding, object::id_from_address(@0x2)); // EVaultAlreadySet

    ts::return_shared(wedding);
    scenario.end();
}

#[test, expected_failure(abort_code = EHostAlreadyExists)]
fun add_duplicate_host_fails() {
    let mut scenario = ts::begin(HOST);
    new_wedding_for_test(&mut scenario);

    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    let cap = scenario.take_from_sender<WeddingCap>();

    add_host(&mut wedding, &cap, HOST); // 이미 호스트 → EHostAlreadyExists

    ts::return_shared(wedding);
    scenario.return_to_sender(cap);
    scenario.end();
}
