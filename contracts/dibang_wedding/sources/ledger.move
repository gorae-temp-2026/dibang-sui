/// 보편 액션 원장(action ledger) — 모든 상호작용의 *raw 사실*을 soulbound 객체로 기록한다.
/// 이것이 신뢰 그래프의 substrate다(모든 신호의 단일 입력원).
///
/// 설계 근거(MASTER_DIRECTIVE / SUI_CONTRACT_DESIGN_DIRECTION §2·§3-B·§4, opus C1):
/// - raw만 저장 / 해석(부조·거래·증여·EM·CS·신용·±극성·청산)은 저장 X — project가 오프체인 계산.
/// - 단일 generic 구조 + action_type(u8) — 모델의 단일 `action` 테이블과 1:1. 업그레이드 안정성 위해 u8.
/// - key-only soulbound — 활동 기록은 transfer 불가(신뢰 세탁 방지).
/// - `log`은 public(package) — 도메인 모듈만 호출(외부 위조 차단). 외부엔 얇은 typed 진입함수만.
/// - **방향(role)·event는 자유 입력이 아니라 actor 소유의 soulbound `Participation`에서 파생**한다(C1):
///   role_id를 위조하면 신용 그래프 방향이 거짓이 되므로, 행위자가 *실제로 보유한* 역할만 기록된다.
/// - `settles`: 이 액션이 청산하는 이전 의무(대여 상환·부조 답례) 링크 — 대여 default(이행 점수)의 raw.
///
/// 주의: 도메인 모듈 `dibang_wedding::event`는 프레임워크 `sui::event`와 이름이 겹쳐 `gathering`으로 alias.
module dibang_wedding::ledger;

use dibang_wedding::event as gathering;
use dibang_wedding::signal::{Self, Signal};
use dibang_wedding::trust_matrix;
use sui::clock::Clock;
use sui::event;

// === Errors ===
/// log 호출자가 제시한 Participation의 주인이 아님(actor ≠ participant).
const EActorMismatch: u64 = 0;
/// 정의되지 않은 action_type.
const EInvalidActionType: u64 = 1;

// === Constants: action_type (raw 동사 — 해석은 project) ===
/// 돈 건넴. (하객→혼주)면 부조, (혼주→업체)면 거래, (sender→recipient)면 증여 — project가 가름.
const ACTION_GIVE_MONEY: u8 = 0;
/// 이음 신청. (예비 — 미emit: 신청은 IumRequest 객체로, 대기 상태라 신호 아님.)
const ACTION_REQUEST_IUM: u8 = 1;
/// 이음 수락 = 매칭 성립. (예비 — 미emit: §3-F대로 매칭 CS는 Event(INYEON)+양측 Participation에서 도출, ledger 미기록.)
const ACTION_ACCEPT_IUM: u8 = 2;
/// 선물(증여) — MoiItem 이전 동반. EM·CS, 단 부조 전파에선 제외(MOICREDIT_AUDIT).
const ACTION_GIFT: u8 = 3;
/// 방명록 메시지.
const ACTION_WRITE_MESSAGE: u8 = 4;
/// 참석(옴). (예비 — 미emit: 참석은 event::participate=Participated가 원천. vestigial 상수, EM 시간환산은 후행.)
const ACTION_ATTEND: u8 = 5;
/// 초대(청첩장). 혼주→하객 사전 관계 신호(CS○★, "디방의 본질") — 가장 직접적 prior-relationship.
const ACTION_INVITE: u8 = 6;
/// 메모리(사진/영상) 공유 — 라운지에 올리는 관계 표현. CS 신호.
const ACTION_SHARE_MEMORY: u8 = 7;
/// 쪽지(DM) 전송 — 1:1 비동기 메시징. CS 신호.
const ACTION_SEND_NOTE: u8 = 8;
/// 정의된 action_type 최댓값(경계 검증용). 새 동사 추가 시 갱신.
const ACTION_TYPE_MAX: u8 = 8;

// ⚠️ 발행 계약(인덱서·credit.ts가 의존 — Critical1 교훈): 실제 emit = GIVE_MONEY(cash_gift::give)·
// WRITE_MESSAGE(guestbook::write)·INVITE(wedding::invite)·GIFT(gift::gift)·SHARE_MEMORY(memory::create_memory)·
// SEND_NOTE(note::send_note). REQUEST_IUM·ACCEPT_IUM·ATTEND는
// 예비 상수로 정의만 — 인연 매칭/참석은 ActionLogged가 아니라 *Participated*(event)에서 도출한다.
// settles는 log에 예비 인자로 있으나 현재 모든 호출이 none — 대여 상환(이행 raw)은 #12 DeFi 재진입 시 활성.

// === Structs ===

/// 액션 한 건의 raw 기록. key-only soulbound.
/// 해석값(자원·극성·청산·EM/CS)은 *의도적으로 없음* — 규칙으로 계산한다.
/// event_id·role_id는 actor가 보유한 Participation에서 파생돼 위조 불가(C1).
public struct ActionRecord has key {
    id: UID,
    event_id: ID,
    action_type: u8,
    actor: address,
    /// 대상(관람·입장처럼 없을 수 있음).
    target: Option<address>,
    /// 행위자가 그 이벤트에서 가진 역할 — fold 방향의 원천(Participation에서 파생).
    role_id: u8,
    amount: u64,
    /// 이 액션이 청산하는 이전 의무(대여 상환 등). 없으면 none.
    /// ⚠️ SCOPE: settles·이행축(perf)은 DeFi(대여-상환) = 신용을 *소비하는* 다운스트림 미래 층(#12) 대비 *예비*다.
    /// 이 컨트랙트(신뢰 신호+신용 substrate)의 미구현/결함이 아님 — scope 밖. (현재 모든 호출이 none.)
    settles: Option<ID>,
    created_at_ms: u64,
    /// 이 액션에서 *온체인 분류*된 신호들(부조/유대, fan-out 0~N). 분류=SSOT — DeFi가 직접 읽고, 인덱서는 SignalEmitted로.
    signals: vector<Signal>,
}

// === Events ===

/// 인덱서가 fold 입력으로 수집하는 균일 로그(필드 미러).
public struct ActionLogged has copy, drop {
    record_id: ID,
    event_id: ID,
    action_type: u8,
    actor: address,
    target: Option<address>,
    role_id: u8,
    amount: u64,
    settles: Option<ID>,
    created_at_ms: u64,
}

// === public(package) functions ===

/// raw 액션을 기록 → actor에 soulbound 발행 + 균일 이벤트 emit. 레코드 ID 반환(settles 링크용).
/// public(package): 도메인 모듈(cash_gift·ium·inyeon·guestbook…)만 호출 → 임의 위조 차단.
/// event_id·role_id는 `participation`(actor 소유 soulbound)에서 파생 → 방향 위조 불가(C1).
public(package) fun log(
    participation: &gathering::Participation,
    action_type: u8,
    target: Option<address>,
    amount: u64,
    settles: Option<ID>,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(action_type <= ACTION_TYPE_MAX, EInvalidActionType);
    let actor = ctx.sender();
    // 행위자는 자기 소유 Participation으로만 기록 가능 → role/event를 사칭할 수 없다.
    assert!(gathering::participant(participation) == actor, EActorMismatch);
    let event_id = gathering::participation_event_id(participation);
    let role_id = gathering::role_id(participation);
    let event_type = gathering::participation_event_type(participation);
    // 온체인 분류: 이 액션 → 0~N 신호(fan-out). 분류 규칙은 signal 모듈(온체인 SSOT); 가중치·전파는 오프체인.
    let signals = signal::project_action(action_type, event_type, role_id, actor, target, amount);

    let rec = ActionRecord {
        id: object::new(ctx),
        event_id,
        action_type,
        actor,
        target,
        role_id,
        amount,
        settles,
        created_at_ms: clock.timestamp_ms(),
        signals,
    };
    let id = object::id(&rec);
    // 분류된 신호를 SignalEmitted로 발행(인덱서/credit.ts 입력) — fan-out 만큼.
    signal::emit_signals(&rec.signals, event_id, clock);
    // 온체인 집계 배선(#40): 분류된 신호를 타입별 TrustMatrix에 반영(매트릭스 타입에 맞는 것만 적용·재전파).
    trust_matrix::apply_classified(matrix, &rec.signals);
    event::emit(ActionLogged {
        record_id: id,
        event_id,
        action_type,
        actor,
        target,
        role_id,
        amount,
        settles,
        created_at_ms: rec.created_at_ms,
    });
    transfer::transfer(rec, actor);
    id
}

// === Views ===

public fun record_event_id(rec: &ActionRecord): ID { rec.event_id }
/// 이 액션에서 분류된 신호들(온체인 SSOT). DeFi 등 온체인 소비자가 직접 읽음.
public fun record_signals(rec: &ActionRecord): vector<Signal> { rec.signals }
public fun action_type(rec: &ActionRecord): u8 { rec.action_type }
public fun actor(rec: &ActionRecord): address { rec.actor }
public fun target(rec: &ActionRecord): Option<address> { rec.target }
public fun record_role_id(rec: &ActionRecord): u8 { rec.role_id }
public fun amount(rec: &ActionRecord): u64 { rec.amount }
public fun settles(rec: &ActionRecord): Option<ID> { rec.settles }
public fun record_created_at_ms(rec: &ActionRecord): u64 { rec.created_at_ms }

// === Constant accessors ===

public fun action_give_money(): u8 { ACTION_GIVE_MONEY }
public fun action_request_ium(): u8 { ACTION_REQUEST_IUM }
public fun action_accept_ium(): u8 { ACTION_ACCEPT_IUM }
public fun action_gift(): u8 { ACTION_GIFT }
public fun action_write_message(): u8 { ACTION_WRITE_MESSAGE }
public fun action_attend(): u8 { ACTION_ATTEND }
public fun action_invite(): u8 { ACTION_INVITE }
public fun action_share_memory(): u8 { ACTION_SHARE_MEMORY }
public fun action_send_note(): u8 { ACTION_SEND_NOTE }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const HOST: address = @0xA1;
#[test_only]
const GUEST: address = @0xB0;

#[test]
fun log_derives_role_and_event_from_participation() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    // 혼주가 결혼식 이벤트 생성(자기=혼주).
    let event_id = gathering::new_event(gathering::event_wedding(), gathering::role_host(), &clk, scenario.ctx());

    // 하객이 GUEST로 참가.
    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<gathering::Event>();
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk, scenario.ctx());
    destroy(cs_mtx);
    ts::return_shared(ev);

    // 하객이 자기 Participation으로 부조(GIVE_MONEY, 대상=혼주) 기록.
    scenario.next_tx(GUEST);
    let part = scenario.take_from_sender<gathering::Participation>();
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_em(), 0, scenario.ctx());
    let rec_id = log(&part, ACTION_GIVE_MONEY, option::some(HOST), 100_000, option::none(), &mut mtx, &clk, scenario.ctx());
    scenario.return_to_sender(part);

    scenario.next_tx(GUEST);
    let rec = scenario.take_from_sender<ActionRecord>();
    assert_eq!(object::id(&rec), rec_id);
    assert_eq!(rec.record_event_id(), event_id);
    assert_eq!(rec.action_type(), ACTION_GIVE_MONEY);
    assert_eq!(rec.actor(), GUEST);
    assert_eq!(rec.record_role_id(), gathering::role_guest()); // 파생된 방향
    assert_eq!(rec.target(), option::some(HOST));
    assert_eq!(rec.amount(), 100_000);
    assert!(rec.settles().is_none());

    scenario.return_to_sender(rec);
    destroy(mtx);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
fun log_null_target_and_settles_link() {
    let mut scenario = ts::begin(HOST);
    let clk = clock::create_for_testing(scenario.ctx());
    gathering::new_event(gathering::event_wedding(), gathering::role_host(), &clk, scenario.ctx());

    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<gathering::Event>();
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk, scenario.ctx());
    destroy(cs_mtx);
    ts::return_shared(ev);

    scenario.next_tx(GUEST);
    let part = scenario.take_from_sender<gathering::Participation>();
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_em(), 0, scenario.ctx());
    // 참석(대상 없음) → 이후 부조가 그것을 청산 링크.
    let first = log(&part, ACTION_ATTEND, option::none(), 0, option::none(), &mut mtx, &clk, scenario.ctx());
    let second = log(&part, ACTION_GIVE_MONEY, option::some(HOST), 50_000, option::some(first), &mut mtx, &clk, scenario.ctx());
    scenario.return_to_sender(part);

    scenario.next_tx(GUEST);
    let r1 = scenario.take_from_sender_by_id<ActionRecord>(first);
    assert!(r1.target().is_none());
    let r2 = scenario.take_from_sender_by_id<ActionRecord>(second);
    assert_eq!(r2.settles(), option::some(first));

    scenario.return_to_sender(r1);
    scenario.return_to_sender(r2);
    destroy(mtx);
    clock::destroy_for_testing(clk);
    scenario.end();
}
