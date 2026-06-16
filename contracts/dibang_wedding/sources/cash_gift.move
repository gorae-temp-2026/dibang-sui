/// CashGift 도메인 — 축의금을 온체인으로 기록한다. 결혼식마다 하나의 모금함
/// (`CashGiftVault`, 공유 오브젝트)에 SUI를 모으고, 송금마다 영수증 격(`CashGiftRecord`)
/// 오브젝트와 이벤트를 남긴다. 인출은 `WeddingCap` 보유자(호스트)만 가능하다.
module dibang_wedding::cash_gift;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::sui::SUI;
use dibang_wedding::wedding::{Self, Wedding, WeddingCap};
use dibang_wedding::utils;

// === Errors ===

/// Cap이 가리키는 결혼식과 모금함의 결혼식이 일치하지 않음.
const EWrongCap: u64 = 0;
/// 송금/인출 금액이 0임.
const EZeroAmount: u64 = 1;
/// 모금함 잔액보다 많이 인출하려 함.
const EInsufficientBalance: u64 = 2;
/// 게스트 이름이 최대 글자 수를 초과함.
const EGuestNameTooLong: u64 = 3;
/// 관계 분류 문자열이 최대 글자 수를 초과함.
const ERelationTooLong: u64 = 4;

// === Constants ===

const MAX_GUEST_NAME_CHARS: u64 = 10;
/// 관계 분류는 짧은 라벨(친구/직장/가족 등)이므로 길이를 제한해 저장 남용을 막는다.
const MAX_RELATION_CHARS: u64 = 30;

// === Structs ===

/// 결혼식별 축의금 모금함. 공유 오브젝트라 누구나 송금할 수 있다.
public struct CashGiftVault has key {
    id: UID,
    wedding_id: ID,
    balance: Balance<SUI>,
}

/// 개별 축의금 송금 기록. `key + store`라 영수증으로 보관·전송할 수 있다.
public struct CashGiftRecord has key, store {
    id: UID,
    wedding_id: ID,
    guest_name: String,
    recipient_slot: String,
    relation_category: String,
    amount: u64,
    created_at: u64,
}

// === Events ===

public struct VaultCreated has copy, drop {
    wedding_id: ID,
    vault_id: ID,
}

public struct CashGiftSent has copy, drop {
    record_id: ID,
    wedding_id: ID,
    guest_name: String,
    recipient_slot: String,
    relation_category: String,
    amount: u64,
    created_at: u64,
}

public struct CashGiftWithdrawn has copy, drop {
    wedding_id: ID,
    amount: u64,
}

// === Public functions ===

/// 결혼식의 축의금 모금함을 생성해 공유한다. `WeddingCap`이 해당 결혼식을 가리켜야 하며,
/// 결혼식당 모금함은 1개로 제한된다(`wedding::set_vault`가 중복을 막는다).
public fun create_vault(wedding: &mut Wedding, cap: &WeddingCap, ctx: &mut TxContext) {
    assert!(wedding::wedding_id(cap) == object::id(wedding), EWrongCap);

    let vault = CashGiftVault {
        id: object::new(ctx),
        wedding_id: object::id(wedding),
        balance: balance::zero<SUI>(),
    };
    let vault_id = object::id(&vault);

    // 결혼식에 모금함을 1회만 연결 — 이미 있으면 여기서 abort(EVaultAlreadySet).
    wedding::set_vault(wedding, vault_id);

    event::emit(VaultCreated { wedding_id: object::id(wedding), vault_id });
    transfer::share_object(vault);
}

/// 축의금을 보낸다. `coin` 전액이 모금함에 입금되고, 송금 기록(`CashGiftRecord`)을
/// 반환해 PTB가 송금인에게 영수증으로 전달하거나 합성하도록 한다.
public fun send_gift(
    vault: &mut CashGiftVault,
    coin: Coin<SUI>,
    guest_name: String,
    recipient_slot: String,
    relation_category: String,
    clock: &Clock,
    ctx: &mut TxContext,
): CashGiftRecord {
    wedding::assert_valid_recipient_slot(&recipient_slot);
    assert!(utils::utf8_char_count(&guest_name) <= MAX_GUEST_NAME_CHARS, EGuestNameTooLong);
    assert!(utils::utf8_char_count(&relation_category) <= MAX_RELATION_CHARS, ERelationTooLong);

    let amount = coin.value();
    assert!(amount > 0, EZeroAmount);

    vault.balance.join(coin.into_balance());

    let record = CashGiftRecord {
        id: object::new(ctx),
        wedding_id: vault.wedding_id,
        guest_name,
        recipient_slot,
        relation_category,
        amount,
        created_at: clock.timestamp_ms(),
    };

    event::emit(CashGiftSent {
        record_id: object::id(&record),
        wedding_id: vault.wedding_id,
        guest_name: record.guest_name,
        recipient_slot: record.recipient_slot,
        relation_category: record.relation_category,
        amount,
        created_at: record.created_at,
    });

    record
}

/// 호스트가 모금함에서 축의금을 인출한다. 인출한 `Coin<SUI>`를 반환해
/// PTB가 호스트 주소로 전달하도록 한다.
public fun withdraw(
    vault: &mut CashGiftVault,
    cap: &WeddingCap,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    assert!(wedding::wedding_id(cap) == vault.wedding_id, EWrongCap);
    assert!(amount > 0, EZeroAmount);
    assert!(vault.balance.value() >= amount, EInsufficientBalance);

    let withdrawn = vault.balance.split(amount);
    event::emit(CashGiftWithdrawn { wedding_id: vault.wedding_id, amount });
    withdrawn.into_coin(ctx)
}

// === Views ===

public fun vault_balance(vault: &CashGiftVault): u64 { vault.balance.value() }
public fun vault_wedding_id(vault: &CashGiftVault): ID { vault.wedding_id }
public fun record_amount(record: &CashGiftRecord): u64 { record.amount }
public fun record_recipient_slot(record: &CashGiftRecord): String { record.recipient_slot }
public fun record_guest_name(record: &CashGiftRecord): String { record.guest_name }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use sui::coin;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const HOST: address = @0xA;
#[test_only]
const GUEST: address = @0x6;

#[test_only]
/// tx1: 결혼식 생성 후 Cap을 HOST에게 전달.
fun setup_wedding(scenario: &mut ts::Scenario) {
    let cap = wedding::create_default_for_testing(scenario.ctx());
    transfer::public_transfer(cap, HOST);
}

#[test_only]
/// (HOST tx 가정) Wedding·Cap을 꺼내 모금함을 생성·공유한다.
fun setup_vault(scenario: &mut ts::Scenario) {
    let mut wedding = scenario.take_shared<Wedding>();
    let cap = scenario.take_from_sender<WeddingCap>();
    create_vault(&mut wedding, &cap, scenario.ctx());
    ts::return_shared(wedding);
    scenario.return_to_sender(cap);
}

#[test_only]
/// (GUEST tx 가정) 모금함에 `amount` 만큼 송금한다.
fun send_amount(scenario: &mut ts::Scenario, amount: u64) {
    let mut vault = scenario.take_shared<CashGiftVault>();
    let clock = clock::create_for_testing(scenario.ctx());
    let coin = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    let record = send_gift(
        &mut vault,
        coin,
        b"Hong".to_string(),
        b"groom".to_string(),
        b"friend".to_string(),
        &clock,
        scenario.ctx(),
    );
    transfer::public_transfer(record, GUEST);
    clock::destroy_for_testing(clock);
    ts::return_shared(vault);
}

#[test]
fun create_vault_links_to_wedding() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(HOST);
    let wedding = scenario.take_shared<Wedding>();
    let vault = scenario.take_shared<CashGiftVault>();
    // 결혼식이 이 모금함을 정확히 가리켜야 한다.
    assert!(wedding::vault_id(&wedding) == option::some(object::id(&vault)));
    ts::return_shared(wedding);
    ts::return_shared(vault);
    scenario.end();
}

#[test]
fun send_gift_increases_balance() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    send_amount(&mut scenario, 1000);

    scenario.next_tx(HOST);
    let vault = scenario.take_shared<CashGiftVault>();
    assert_eq!(vault_balance(&vault), 1000);
    ts::return_shared(vault);
    scenario.end();
}

#[test]
fun withdraw_decreases_balance() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    send_amount(&mut scenario, 1000);

    scenario.next_tx(HOST);
    {
        let mut vault = scenario.take_shared<CashGiftVault>();
        let cap = scenario.take_from_sender<WeddingCap>();
        let coin = withdraw(&mut vault, &cap, 600, scenario.ctx());
        assert_eq!(coin.value(), 600);
        assert_eq!(vault_balance(&vault), 400);
        transfer::public_transfer(coin, HOST);
        scenario.return_to_sender(cap);
        ts::return_shared(vault);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = EWrongCap)]
fun withdraw_with_wrong_cap_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(HOST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    // 다른 결혼식을 가리키는 가짜 Cap → EWrongCap (잔액 검사 이전에 막혀야 함)
    let fake_cap = wedding::new_cap_for_testing(object::id_from_address(@0xBAD), scenario.ctx());
    let coin = withdraw(&mut vault, &fake_cap, 100, scenario.ctx());

    // 미도달 — 컴파일 위한 소비.
    destroy(coin);
    destroy(fake_cap);
    ts::return_shared(vault);
    scenario.end();
}

#[test, expected_failure(abort_code = ERelationTooLong)]
fun relation_too_long_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    let clock = clock::create_for_testing(scenario.ctx());
    let coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());

    // 31글자 > 30
    let mut relation = b"".to_string();
    let mut i = 0u64;
    while (i < 31) { relation.append(b"a".to_string()); i = i + 1; };

    let record = send_gift(
        &mut vault,
        coin,
        b"Hong".to_string(),
        b"groom".to_string(),
        relation,
        &clock,
        scenario.ctx(),
    );

    // 미도달 — 컴파일 위한 소비.
    destroy(record);
    clock::destroy_for_testing(clock);
    ts::return_shared(vault);
    scenario.end();
}

#[test, expected_failure(abort_code = EZeroAmount)]
fun send_zero_gift_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    let clock = clock::create_for_testing(scenario.ctx());
    let coin = coin::mint_for_testing<SUI>(0, scenario.ctx());
    let record = send_gift(
        &mut vault,
        coin,
        b"Hong".to_string(),
        b"groom".to_string(),
        b"friend".to_string(),
        &clock,
        scenario.ctx(),
    );

    // 미도달 — 컴파일 위한 소비.
    destroy(record);
    clock::destroy_for_testing(clock);
    ts::return_shared(vault);
    scenario.end();
}

#[test, expected_failure(abort_code = EInsufficientBalance)]
fun withdraw_too_much_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    send_amount(&mut scenario, 1000);

    scenario.next_tx(HOST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    let cap = scenario.take_from_sender<WeddingCap>();
    let coin = withdraw(&mut vault, &cap, 2000, scenario.ctx()); // 잔액 1000 < 2000

    // 미도달 — 컴파일 위한 소비.
    destroy(coin);
    scenario.return_to_sender(cap);
    ts::return_shared(vault);
    scenario.end();
}
