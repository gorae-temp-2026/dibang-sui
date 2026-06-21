/// Cross-module 통합(e2e) 테스트 — 한 결혼식 Event를 여러 도메인 모듈이 관통할 때
/// 신뢰 그래프의 *발행 계약*이 일관되는지 검증한다.
///
/// 왜 필요한가(Critical1 교훈): 모듈별 단위 테스트는 다 통과하는데 모듈을 *잇는 계약*
/// (어느 action이 어느 event_id·역할로 ledger에 들어가나)이 어긋나면 신용 파이프라인이
/// 조용히 끊긴다(인연 매칭이 ledger 미기록인데 credit이 ActionLogged로 기대했던 건). 이 테스트는
/// invite·give·write가 같은 Event(같은 event_id)에 행위자 역할대로 쌓이는지를 한 시나리오로 못박는다.
#[test_only]
module dibang_wedding::integration_tests;

use sui::test_scenario as ts;
use sui::clock;
use sui::coin;
use sui::sui::SUI;
use std::unit_test::assert_eq;
use dibang_wedding::wedding::{Self, Wedding};
use dibang_wedding::event as gathering;
use dibang_wedding::ledger::{Self, ActionRecord};
use dibang_wedding::cash_gift::{Self, CashGiftVault};
use dibang_wedding::guestbook;
use dibang_wedding::signal;

const HOST: address = @0xA;
const GUEST: address = @0xB;

/// 웨딩 신호셋(초대·부조·방명록)이 한 Event를 관통하며 event_id·역할이 일관된다.
#[test]
fun wedding_signals_share_one_event_and_roles() {
    let mut scenario = ts::begin(HOST);
    // 1) 혼주가 결혼식 생성 — Event(WEDDING) + 혼주 HOST Participation + WeddingCap.
    wedding::create_default_for_testing(scenario.ctx()); // cap → sender(HOST) 내부 transfer(key-only)

    // 2) 혼주가 모금함 생성 + 하객 초대(INVITE, 혼주 HOST participation으로).
    scenario.next_tx(HOST);
    let mut wedding = scenario.take_shared<Wedding>();
    let cap = scenario.take_from_sender<wedding::WeddingCap>(); // key-only: 생성 시 sender(HOST)에게 transfer됨
    cash_gift::create_vault(&mut wedding, &cap, scenario.ctx());
    let host_part = scenario.take_from_sender<gathering::Participation>();
    let clk = clock::create_for_testing(scenario.ctx());
    let invite_id = wedding::invite(&wedding, &host_part, GUEST, &clk, scenario.ctx());
    let wedding_event_id = wedding::event_id(&wedding);
    scenario.return_to_sender(host_part);
    ts::return_shared(wedding);

    // 3) 하객이 참가(GUEST Participation — 출석 신호의 원천).
    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<gathering::Event>();
    gathering::participate(&ev, gathering::role_guest(), &clk, scenario.ctx());
    ts::return_shared(ev);

    // 4) 하객이 부조(GIVE_MONEY, 실제 SUI) + 방명록(WRITE_MESSAGE) — 같은 GUEST participation 체인.
    scenario.next_tx(GUEST);
    let wedding = scenario.take_shared<Wedding>();
    let mut vault = scenario.take_shared<CashGiftVault>();
    let guest_part = scenario.take_from_sender<gathering::Participation>();
    let coin = coin::mint_for_testing<SUI>(100_000, scenario.ctx());
    let give_id = cash_gift::give(&mut vault, &wedding, &guest_part, coin, &clk, scenario.ctx());
    let write_id = guestbook::write(&wedding, &guest_part, &clk, scenario.ctx());
    scenario.return_to_sender(guest_part);
    ts::return_shared(vault);
    ts::return_shared(wedding);

    // 5a) 혼주 INVITE 레코드: event_id 일치 · HOST 역할 · target=하객.
    scenario.next_tx(HOST);
    let inv = scenario.take_from_sender_by_id<ActionRecord>(invite_id);
    assert_eq!(ledger::record_event_id(&inv), wedding_event_id);
    assert_eq!(ledger::action_type(&inv), ledger::action_invite());
    assert_eq!(ledger::actor(&inv), HOST);
    assert_eq!(ledger::record_role_id(&inv), gathering::role_host());
    assert_eq!(ledger::target(&inv), option::some(GUEST));
    scenario.return_to_sender(inv);

    // 5b) 하객 GIVE_MONEY·WRITE_MESSAGE: 같은 event_id · GUEST 역할 · 금액.
    scenario.next_tx(GUEST);
    let g = scenario.take_from_sender_by_id<ActionRecord>(give_id);
    let w = scenario.take_from_sender_by_id<ActionRecord>(write_id);
    assert_eq!(ledger::record_event_id(&g), wedding_event_id); // 부조도 같은 결혼식 Event
    assert_eq!(ledger::record_event_id(&w), wedding_event_id); // 방명록도 같은 Event
    assert_eq!(ledger::action_type(&g), ledger::action_give_money());
    assert_eq!(ledger::action_type(&w), ledger::action_write_message());
    assert_eq!(ledger::actor(&g), GUEST);
    assert_eq!(ledger::record_role_id(&g), gathering::role_guest()); // 방향=하객(파생)
    assert_eq!(ledger::amount(&g), 100_000);
    // 온체인 분류(SSOT): 부조 → ActionRecord.signals = [BUSU(하객→혼주, amount)], 방명록 → [CS]. DeFi가 직접 읽음.
    let gsig = ledger::record_signals(&g);
    assert_eq!(gsig.length(), 1);
    assert_eq!(signal::kind(gsig.borrow(0)), signal::kind_busu());
    assert_eq!(signal::from(gsig.borrow(0)), GUEST);
    assert_eq!(signal::to(gsig.borrow(0)), HOST);
    assert_eq!(signal::magnitude(gsig.borrow(0)), 100_000);
    let wsig = ledger::record_signals(&w);
    assert_eq!(wsig.length(), 1);
    assert_eq!(signal::kind(wsig.borrow(0)), signal::kind_cs());
    scenario.return_to_sender(g);
    scenario.return_to_sender(w);

    ts::return_to_address(HOST, cap); // key-only: take_from(HOST)했으니 HOST로 명시 반환
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
/// 안티-드리프트(적대 리뷰 CRITICAL급 예방): signal.move는 ledger/event 상수를 u8 *미러*로 둔다(순환 회피).
/// 그 값이 바뀌면 signal 분류가 조용히 어긋난다. 여기서 실제 상수값을 핀 — 미러 동기가 깨지면 이 테스트가 깨져
/// signal.move 미러 갱신이 필요함을 알린다(빌드/유닛이 못 잡던 결함을 테스트로 전환).
fun signal_mirror_constants_pinned() {
    assert_eq!(ledger::action_give_money(), 0);
    assert_eq!(ledger::action_accept_ium(), 2);
    assert_eq!(ledger::action_gift(), 3);
    assert_eq!(ledger::action_write_message(), 4);
    assert_eq!(ledger::action_attend(), 5);
    assert_eq!(ledger::action_invite(), 6);
    assert_eq!(gathering::event_wedding(), 0);
    assert_eq!(gathering::role_guest(), 1);
}
