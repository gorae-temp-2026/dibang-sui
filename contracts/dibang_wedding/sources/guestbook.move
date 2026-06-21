/// Guestbook 도메인 — 방명록 작성을 *신뢰 신호*로 기록한다.
///
/// 설계(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION §3-B·§4, 결정#2):
/// - 방명록 "작성했다"는 *행위 사실*만 온체인(보편 액션 원장 WRITE_MESSAGE). 메시지 본문·작성자 이름 등
///   사람 관련 정보는 **오프체인**(신원-불가지 지갑 그래프). 라운지 피드는 오프체인이 렌더한다.
/// - 구식 GuestbookEntry(key+store=transfer 가능, 평문 guest_name·message 온체인)는 제거 — VISION §7·결정#2·SBT 위반.
/// - 부조(cash_gift::give)와 같은 패턴: wedding Event + 하객 Participation으로 방향(하객→혼주) 귀속.
module dibang_wedding::guestbook;

use sui::clock::Clock;
use dibang_wedding::wedding::{Self, Wedding};
use dibang_wedding::ledger;
// 도메인 이벤트 모듈은 프레임워크 sui::event와 이름이 겹쳐 gathering으로 alias.
use dibang_wedding::event as gathering;

// === Errors ===

/// 하객의 참가(Participation)가 이 결혼식의 이벤트가 아님.
const EWrongEvent: u64 = 0;

// === Public functions ===

/// 방명록 작성 = 참여(WRITE_MESSAGE) 신호를 보편 액션 원장에 soulbound로 기록한다.
/// 메시지 본문·이름은 받지 않는다(오프체인). 하객(participation)은 이 결혼식 이벤트에 참가했어야 하고,
/// 대상은 혼주(primary host). 해석(EM/CS)은 project가 오프체인 계산. 원장 레코드 ID 반환.
public fun write(
    wedding: &Wedding,
    participation: &gathering::Participation,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(gathering::participation_event_id(participation) == wedding::event_id(wedding), EWrongEvent);
    let host = wedding::primary_host(wedding);
    // role/event는 ledger가 participation에서 파생(방향 위조 차단). amount=0(돈 없음), 본문 오프체인.
    ledger::log(participation, ledger::action_write_message(), option::some(host), 0, option::none(), clock, ctx)
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::assert_eq;

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
    gathering::participate(&ev, gathering::role_guest(), &clk0, scenario.ctx());
    clock::destroy_for_testing(clk0);
    ts::return_shared(ev);

    // 하객이 방명록 작성 → WRITE_MESSAGE 신호 기록(본문 미저장).
    scenario.next_tx(GUEST);
    let wedding = scenario.take_shared<Wedding>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let clk = clock::create_for_testing(scenario.ctx());
    let rec_id = write(&wedding, &part, &clk, scenario.ctx());
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
