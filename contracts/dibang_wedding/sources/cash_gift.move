/// CashGift 도메인 — 축의금을 온체인으로 처리한다. 결혼식마다 하나의 모금함
/// (`CashGiftVault`, 공유 오브젝트)에 실제 SUI를 모은다. 부조 행위는 보편 액션 원장
/// (`ledger::ActionRecord`, soulbound)에 GIVE_MONEY로 기록되고, 해석(부조/EM/CS)은 오프체인 project가 한다.
///
/// 신원-불가지(MASTER_DIRECTIVE): 이름·관계 같은 PII는 온체인에 담지 않는다. (구식 send_gift+CashGiftRecord는
/// PII 평문 + key+store(transfer 가능) 위반이라 제거하고 `give`로 일원화했다.)
module dibang_wedding::cash_gift;

use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::sui::SUI;
use dibang_wedding::wedding::{Self, Wedding, WeddingCap};
use dibang_wedding::ledger;
// 도메인 이벤트 모듈은 프레임워크 sui::event와 이름이 겹쳐 gathering으로 alias.
use dibang_wedding::event as gathering;

// === Errors ===

/// Cap이 가리키는 결혼식과 모금함의 결혼식이 일치하지 않음.
const EWrongCap: u64 = 0;
/// 송금/인출 금액이 0임.
const EZeroAmount: u64 = 1;
/// 모금함 잔액보다 많이 인출하려 함.
const EInsufficientBalance: u64 = 2;
/// 하객의 참가(Participation)가 이 결혼식의 이벤트가 아님.
const EWrongEvent: u64 = 3;

// === Structs ===

/// 결혼식별 축의금 모금함. 공유 오브젝트라 누구나 송금할 수 있다.
public struct CashGiftVault has key {
    id: UID,
    wedding_id: ID,
    balance: Balance<SUI>,
}

// === Events ===

public struct VaultCreated has copy, drop {
    wedding_id: ID,
    vault_id: ID,
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

/// 부조 — 실제 SUI를 모금함에 입금하고, 그 행위를 보편 액션 원장에 GIVE_MONEY로 기록한다(soulbound).
/// 하객(participation)은 이 결혼식 이벤트(wedding.event_id)에 참가했어야 하고, 대상은 혼주(primary host).
/// 해석(부조/EM/CS)은 저장 안 함 — project가 (GIVE_MONEY × WEDDING × 하객→혼주)로 계산. 원장 레코드 ID 반환.
/// 이름·관계 같은 PII는 받지 않는다(신원-불가지 지갑 그래프).
public fun give(
    vault: &mut CashGiftVault,
    wedding: &Wedding,
    participation: &gathering::Participation,
    coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(vault.wedding_id == object::id(wedding), EWrongCap);
    // 하객의 역할이 *이 결혼식의 이벤트*에서 온 것이어야 부조 방향(하객→혼주)이 올바르게 귀속된다.
    assert!(gathering::participation_event_id(participation) == wedding::event_id(wedding), EWrongEvent);
    let amount = coin.value();
    assert!(amount > 0, EZeroAmount);

    vault.balance.join(coin.into_balance());

    let host = wedding::primary_host(wedding);
    // role/event는 ledger가 participation에서 파생(방향 위조 차단). amount는 raw(결정#1 평문).
    ledger::log(participation, ledger::action_give_money(), option::some(host), amount, option::none(), clock, ctx)
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
/// 테스트용 직접 입금 — withdraw 등 잔액 의존 테스트의 펀딩. (실 부조 경로는 give 테스트가 검증.)
fun deposit_for_testing(scenario: &mut ts::Scenario, amount: u64) {
    let mut vault = scenario.take_shared<CashGiftVault>();
    let coin = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    vault.balance.join(coin.into_balance());
    ts::return_shared(vault);
}

#[test_only]
/// (GUEST tx 가정) 하객이 결혼식 이벤트에 GUEST로 참가한다(부조 전 단계).
fun participate_as_guest(scenario: &mut ts::Scenario) {
    let ev = scenario.take_shared<gathering::Event>();
    let clk = clock::create_for_testing(scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &clk, scenario.ctx());
    clock::destroy_for_testing(clk);
    ts::return_shared(ev);
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
fun give_deposits_and_logs_action() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    participate_as_guest(&mut scenario);

    // 하객이 부조: 실제 SUI 입금 + GIVE_MONEY 원장 기록(한 트랜잭션).
    scenario.next_tx(GUEST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    let wedding = scenario.take_shared<Wedding>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let clk = clock::create_for_testing(scenario.ctx());
    let coin = coin::mint_for_testing<SUI>(100_000, scenario.ctx());
    let rec_id = give(&mut vault, &wedding, &part, coin, &clk, scenario.ctx());
    assert_eq!(vault_balance(&vault), 100_000); // 실제 SUI 입금됨
    clock::destroy_for_testing(clk);
    scenario.return_to_sender(part);
    ts::return_shared(wedding);
    ts::return_shared(vault);

    // 원장에 부조 액션이 soulbound로 남고, 방향(하객→혼주)이 파생됐는지.
    scenario.next_tx(GUEST);
    let rec = scenario.take_from_sender_by_id<ledger::ActionRecord>(rec_id);
    assert_eq!(rec.action_type(), ledger::action_give_money());
    assert_eq!(rec.actor(), GUEST);
    assert_eq!(rec.record_role_id(), gathering::role_guest());
    assert_eq!(rec.target(), option::some(HOST));
    assert_eq!(rec.amount(), 100_000);
    scenario.return_to_sender(rec);
    scenario.end();
}

#[test, expected_failure(abort_code = EZeroAmount)]
fun give_zero_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    participate_as_guest(&mut scenario);

    scenario.next_tx(GUEST);
    let mut vault = scenario.take_shared<CashGiftVault>();
    let wedding = scenario.take_shared<Wedding>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let clk = clock::create_for_testing(scenario.ctx());
    let coin = coin::mint_for_testing<SUI>(0, scenario.ctx());
    give(&mut vault, &wedding, &part, coin, &clk, scenario.ctx()); // EZeroAmount
    abort
}

#[test]
fun withdraw_decreases_balance() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    deposit_for_testing(&mut scenario, 1000);

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

#[test, expected_failure(abort_code = EInsufficientBalance)]
fun withdraw_too_much_fails() {
    let mut scenario = ts::begin(HOST);
    setup_wedding(&mut scenario);
    scenario.next_tx(HOST);
    setup_vault(&mut scenario);

    scenario.next_tx(GUEST);
    deposit_for_testing(&mut scenario, 1000);

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
