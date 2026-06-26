/// Gift(선물) 도메인 — 증여(MoiItem 선물)를 자산 이전 + 신뢰 신호로 동시에 처리한다.
///
/// 설계(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION §3-G, MOICREDIT_AUDIT):
/// - 선물 = **자산 이동(MoiItem public_transfer) + GIFT 신호(soulbound ActionRecord)** 한 트랜잭션.
///   자산은 옮겨가도 "증여했다"는 기록은 giver에 soulbound로 남는다.
/// - 방향(giver→recipient)·event는 giver의 `Participation`에서 파생(위조 불가, ledger participant==sender).
/// - 증여는 EM·CS 둘 다지만, **EM은 부조(reciprocity) 전파에서 제외**한다 — sole-giver 악용 방지
///   (아무에게나 선물해 점수 농사 차단). 이 제외는 *인덱서/Φ*가 하고, 온체인은 raw GIFT만 남긴다.
/// - event-agnostic: giver의 participation이 event 컨텍스트(인연 매칭/웨딩 등)를 제공.
/// - 구매(샵, 나→시스템)·장착/배치는 신호가 아님(§3-G) — 그건 moi/moiPlaza의 자산/꾸미기 연산.
///   단 구매는 결정#6(2026-06-21)대로 **SUI 결제로 게이트**돼야 한다(무료 발행이면 gift-CS 농사 → moi.move 참조).
module dibang_wedding::gift;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::moi::{Self, MoiItem};
use dibang_wedding::ledger;
use dibang_wedding::trust_matrix;
use dibang_wedding::event as gathering;

// === Errors ===
const ESelfGift: u64 = 0;

// === Events ===

public struct GiftSent has copy, drop {
    item_id: ID,
    item_name: String,
    from: address,
    to: address,
}

// === Public functions ===

/// 선물 — `item`(MoiItem)을 `recipient`에게 이전하고, GIFT 신호를 보편 액션 원장에 기록한다.
/// giver는 `participation`(자기 소유 soulbound)으로만 호출 가능(방향·event 파생). 원장 레코드 ID 반환.
public fun gift(
    participation: &gathering::Participation,
    item: MoiItem,
    recipient: address,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(ctx.sender() != recipient, ESelfGift);
    let item_id = object::id(&item);
    let item_name = moi::item_name(&item);
    // 자산 이동 — MoiItem은 key+store(거래/선물 의도). 수령자가 소유하게 됨.
    transfer::public_transfer(item, recipient);
    event::emit(GiftSent { item_id, item_name, from: ctx.sender(), to: recipient });
    // 신호 — 증여 사실. amount=0(아이템 선물, 금전 잔액 아님). role/event는 participation 파생.
    ledger::log(participation, ledger::action_gift(), option::some(recipient), 0, option::none(), matrix, clock, ctx)
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::{assert_eq, destroy};
#[test_only]
use dibang_wedding::wedding;

#[test_only]
const HOST: address = @0xA;
#[test_only]
const GIVER: address = @0x6;
#[test_only]
const RECIPIENT: address = @0xB0;

#[test]
fun gift_transfers_item_and_logs_signal() {
    let mut scenario = ts::begin(HOST);
    // 혼주가 결혼식 생성(Event 포함). (gift는 event-agnostic이라 웨딩 참가로 테스트.)
    wedding::create_default_for_testing(scenario.ctx()); // cap → sender(HOST) 내부 transfer(key-only)

    // GIVER가 결혼식 이벤트에 GUEST로 참가.
    scenario.next_tx(GIVER);
    let ev = scenario.take_shared<gathering::Event>();
    let clk0 = clock::create_for_testing(scenario.ctx());
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk0, scenario.ctx());
    destroy(cs_mtx);
    clock::destroy_for_testing(clk0);
    ts::return_shared(ev);

    // GIVER가 MoiItem을 만들어 RECIPIENT에게 선물 + GIFT 신호 기록.
    scenario.next_tx(GIVER);
    let part = scenario.take_from_sender<gathering::Participation>();
    let item = moi::mint_item(b"Bouquet".to_string(), b"deco".to_string(), b"hand".to_string(), scenario.ctx());
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    let clk = clock::create_for_testing(scenario.ctx());
    let rec_id = gift(&part, item, RECIPIENT, &mut mtx, &clk, scenario.ctx());
    // 배선 검증: 선물 CS가 매트릭스에 반영(받는 쪽 RECIPIENT authority↑).
    assert_eq!(trust_matrix::pi_of(&mtx, RECIPIENT), 138_750_000);
    destroy(mtx);
    clock::destroy_for_testing(clk);
    scenario.return_to_sender(part);

    // RECIPIENT가 MoiItem 수령(자산 이동 확인).
    scenario.next_tx(RECIPIENT);
    let received = scenario.take_from_sender<MoiItem>();
    assert_eq!(received.item_name(), b"Bouquet".to_string());
    scenario.return_to_sender(received);

    // GIVER에게 GIFT ActionRecord(soulbound, 방향 giver→recipient) 남음.
    scenario.next_tx(GIVER);
    let rec = scenario.take_from_sender_by_id<ledger::ActionRecord>(rec_id);
    assert_eq!(rec.action_type(), ledger::action_gift());
    assert_eq!(rec.actor(), GIVER);
    assert_eq!(rec.record_role_id(), gathering::role_guest());
    assert_eq!(rec.target(), option::some(RECIPIENT));
    assert_eq!(rec.amount(), 0);
    scenario.return_to_sender(rec);

    scenario.end();
}

#[test, expected_failure(abort_code = ESelfGift)]
fun self_gift_fails() {
    let mut scenario = ts::begin(HOST);
    wedding::create_default_for_testing(scenario.ctx());

    scenario.next_tx(GIVER);
    let ev = scenario.take_shared<gathering::Event>();
    let clk = clock::create_for_testing(scenario.ctx());
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk, scenario.ctx());
    destroy(cs_mtx);
    ts::return_shared(ev);

    scenario.next_tx(GIVER);
    let part = scenario.take_from_sender<gathering::Participation>();
    let item = moi::mint_item(b"Hat".to_string(), b"deco".to_string(), b"head".to_string(), scenario.ctx());
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gift(&part, item, GIVER, &mut mtx, &clk, scenario.ctx());
    abort
}
