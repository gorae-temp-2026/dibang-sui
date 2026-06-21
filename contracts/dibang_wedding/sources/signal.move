/// Signal 도메인 — 신뢰 *신호*를 온체인에서 분류·발행한다 (분류=온체인 SSOT).
///
/// 설계 의도(사용자 결정): "이 액션이 부조/유대다"라는 *분류(project)*는 온체인에 둔다 — DeFi가 신용을
/// trustless하게 쓰려면 신호의 소스가 온체인이어야 한다. 단 *가중치·전파(PageRank)·극성·wash 상쇄* 같은
/// 튜닝성/그래프-단위 계산은 오프체인(credit.ts)에 남긴다(분류=온체인 / 집계=오프체인).
///
/// 핵심: **한 액션 → 0~N개 신호**(fan-out). (action_type × event_type × role)에 따라 신호 종류·방향·개수가
/// 달라진다(예: 매칭=양방향 2개, 부조=1개, 대기=0개). 그래서 project는 `vector<Signal>`을 낸다.
/// (참석은 현재 CS 1개; EM 시간부조로의 이중화는 모델 확정(07/08) 후 추가 — 그 전엔 단일.)
///
/// **신호는 출처(source=원천 action)를 보존한다.** 분류가 행위 종류를 버리면 오프체인이 행위별 CS 차등
/// 가중(참석 vs 답례 vs 초대)을 복원할 수 없다 → "가중치=오프체인" 원칙이 깨진다. 그래서 kind(부조/유대)와
/// 별개로 source를 실어, 분류는 온체인이 하되 *가중 재료*는 오프체인에 온전히 넘긴다.
///
/// 온체인 읽기 모델(DeFi trustless): 분류의 SSOT = 이 모듈의 *순수 함수*(project_action·match_signals·
/// attendance_signals)다. 온체인 소비자는 stored 소스 객체(ActionRecord·Event·Participation)를 들고 이 함수를
/// 호출해 분류를 trustless하게 재현한다. ledger는 편의를 위해 결과를 ActionRecord.signals에 캐시도 한다.
/// 인덱서/credit.ts는 SignalEmitted 이벤트로 받는다(오프체인 전용 경로).
///
/// 주의: 이 모듈은 ledger/event를 import하지 않는다(그들이 signal을 호출 → 순환 방지). 그래서 action/event/role
/// 값은 u8 *미러 상수*로 둔다(append-only라 안정 — ledger.move/event.move와 동기 유지).
module dibang_wedding::signal;

use sui::event;
use sui::clock::Clock;

// === SignalKind (u8, append-only) ===
/// 무신호(분류 결과 없음).
const KIND_NONE: u8 = 0;
/// 부조(EM) — 하객→혼주, magnitude=금액.
const KIND_BUSU: u8 = 1;
/// 유대(CS) — magnitude=1. 초대·방명록·선물·참석·매칭. 행위 구분은 source로.
const KIND_CS: u8 = 2;

// === 미러 상수 (ledger.move action_type / event.move event_type·role 와 동기 — append-only) ===
const A_GIVE_MONEY: u8 = 0;
const A_ACCEPT_IUM: u8 = 2;
const A_GIFT: u8 = 3;
const A_WRITE_MESSAGE: u8 = 4;
const A_ATTEND: u8 = 5;
const A_INVITE: u8 = 6;
const E_WEDDING: u8 = 0;
const R_GUEST: u8 = 1;

// === Structs ===

/// 신호 한 개(값 타입 — 객체 아님). copy+drop+store: 반환·emit·ActionRecord 저장에 쓰임.
public struct Signal has copy, drop, store {
    kind: u8,
    /// 이 신호를 만든 원천 행위(action_type 또는 참석=ATTEND·매칭=ACCEPT_IUM). 오프체인 차등 가중용.
    source: u8,
    from: address,
    to: address,
    /// EM=금액, CS=1.
    magnitude: u64,
}

// === Events ===

/// 인덱서/credit.ts가 읽는 분류된 신호(필드 미러). 한 액션이 여러 개 emit할 수 있다(fan-out).
public struct SignalEmitted has copy, drop {
    event_id: ID,
    kind: u8,
    source: u8,
    from: address,
    to: address,
    magnitude: u64,
    created_at_ms: u64,
}

// === Constructors / Views ===

public fun new_signal(kind: u8, source: u8, from: address, to: address, magnitude: u64): Signal {
    Signal { kind, source, from, to, magnitude }
}

public fun kind(s: &Signal): u8 { s.kind }
public fun source(s: &Signal): u8 { s.source }
public fun from(s: &Signal): address { s.from }
public fun to(s: &Signal): address { s.to }
public fun magnitude(s: &Signal): u64 { s.magnitude }

public fun kind_none(): u8 { KIND_NONE }
public fun kind_busu(): u8 { KIND_BUSU }
public fun kind_cs(): u8 { KIND_CS }

// === Classification (project) — 순수 함수, 한 액션 → 0~N 신호 ===

/// ActionLogged 기반 액션을 신호 벡터로 분류한다(부조·방명록·초대·선물). fan-out=벡터 길이. source=action_type 보존.
/// - GIVE_MONEY @ WEDDING & role=GUEST & amount>0 → [BUSU(actor→target, amount)] (부조 1개)
/// - WRITE_MESSAGE / INVITE / GIFT → [CS(actor→target, 1)] (유대 1개)
/// - target 없음 / 자기엣지(actor==target) / 그 외 → [] (무신호)
/// (인연 매칭·참석은 여기 아님 — Participated 기반이라 match_signals/attendance_signals로.)
public fun project_action(
    action_type: u8,
    event_type: u8,
    role_id: u8,
    actor: address,
    target: Option<address>,
    amount: u64,
): vector<Signal> {
    let mut out = vector<Signal>[];
    if (target.is_none()) return out;
    let to = *target.borrow();
    if (actor == to) return out; // 자기엣지(자기거래 농사) 제외 — 온체인 per-action 가능
    if (action_type == A_GIVE_MONEY && event_type == E_WEDDING && role_id == R_GUEST && amount > 0) {
        out.push_back(new_signal(KIND_BUSU, action_type, actor, to, amount));
    } else if (action_type == A_WRITE_MESSAGE || action_type == A_INVITE || action_type == A_GIFT) {
        out.push_back(new_signal(KIND_CS, action_type, actor, to, 1));
    };
    out
}

/// 인연 매칭(accept) → 양방향 CS 2개(initiator↔receiver). source=ACCEPT_IUM. 자기엣지면 빈 벡터.
public fun match_signals(initiator: address, receiver: address): vector<Signal> {
    let mut out = vector<Signal>[];
    if (initiator == receiver) return out;
    out.push_back(new_signal(KIND_CS, A_ACCEPT_IUM, receiver, initiator, 1));
    out.push_back(new_signal(KIND_CS, A_ACCEPT_IUM, initiator, receiver, 1));
    out
}

/// 웨딩 참석(participate) → 참가자→혼주 단방향 CS 1개. source=ATTEND. 자기 이벤트(participant==creator)면 빈 벡터.
public fun attendance_signals(participant: address, creator: address): vector<Signal> {
    let mut out = vector<Signal>[];
    if (participant == creator) return out;
    out.push_back(new_signal(KIND_CS, A_ATTEND, participant, creator, 1));
    out
}

// === Emit (도메인 모듈이 호출) ===

/// 신호 벡터를 SignalEmitted 이벤트로 발행한다(fan-out=벡터 만큼 emit). event_id는 발생 컨텍스트(Event).
public fun emit_signals(signals: &vector<Signal>, event_id: ID, clock: &Clock) {
    let ts = clock.timestamp_ms();
    let n = signals.length();
    let mut i = 0;
    while (i < n) {
        let s = signals.borrow(i);
        event::emit(SignalEmitted {
            event_id,
            kind: s.kind,
            source: s.source,
            from: s.from,
            to: s.to,
            magnitude: s.magnitude,
            created_at_ms: ts,
        });
        i = i + 1;
    };
}

// === Tests ===

#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const A: address = @0xA;
#[test_only]
const B: address = @0xB;

#[test]
fun busu_one_signal() {
    // 부조: GIVE_MONEY @ WEDDING & GUEST & amount>0 → BUSU 1개(actor→target, amount), source=GIVE_MONEY.
    let v = project_action(A_GIVE_MONEY, E_WEDDING, R_GUEST, A, option::some(B), 100_000);
    assert_eq!(v.length(), 1);
    let s = v.borrow(0);
    assert_eq!(s.kind(), KIND_BUSU);
    assert_eq!(s.source(), A_GIVE_MONEY);
    assert_eq!(s.from(), A);
    assert_eq!(s.to(), B);
    assert_eq!(s.magnitude(), 100_000);
}

#[test]
fun cs_signals_preserve_source() {
    // CS는 출처 action을 보존(오프체인 차등 가중 재료).
    let m = project_action(A_WRITE_MESSAGE, E_WEDDING, R_GUEST, A, option::some(B), 0);
    assert_eq!(m.length(), 1);
    assert_eq!(m.borrow(0).kind(), KIND_CS);
    assert_eq!(m.borrow(0).source(), A_WRITE_MESSAGE);
    assert_eq!(project_action(A_INVITE, E_WEDDING, 0, A, option::some(B), 0).borrow(0).source(), A_INVITE);
    let g = project_action(A_GIFT, E_INYEON_FOR_TEST(), 3, A, option::some(B), 0);
    assert_eq!(g.borrow(0).kind(), KIND_CS);
    assert_eq!(g.borrow(0).source(), A_GIFT);
}

#[test]
fun give_non_guest_or_zero_no_busu() {
    // 비-GUEST give(역할=HOST=0) → 부조 아님(빈).
    assert_eq!(project_action(A_GIVE_MONEY, E_WEDDING, 0, A, option::some(B), 100_000).length(), 0);
    // amount 0 → 빈.
    assert_eq!(project_action(A_GIVE_MONEY, E_WEDDING, R_GUEST, A, option::some(B), 0).length(), 0);
}

#[test]
fun self_edge_and_no_target_empty() {
    // 자기엣지.
    assert_eq!(project_action(A_GIVE_MONEY, E_WEDDING, R_GUEST, A, option::some(A), 100).length(), 0);
    // target 없음.
    assert_eq!(project_action(A_WRITE_MESSAGE, E_WEDDING, R_GUEST, A, option::none(), 0).length(), 0);
}

#[test]
fun match_is_bidirectional() {
    let v = match_signals(A, B); // initiator=A, receiver=B
    assert_eq!(v.length(), 2);
    assert_eq!(v.borrow(0).kind(), KIND_CS);
    assert_eq!(v.borrow(0).source(), A_ACCEPT_IUM);
    assert_eq!(v.borrow(1).kind(), KIND_CS);
    // 자기엣지면 빈.
    assert_eq!(match_signals(A, A).length(), 0);
}

#[test]
fun attendance_single_direction() {
    let v = attendance_signals(B, A); // participant=B → creator=A
    assert_eq!(v.length(), 1);
    assert_eq!(v.borrow(0).from(), B);
    assert_eq!(v.borrow(0).to(), A);
    assert_eq!(v.borrow(0).source(), A_ATTEND);
    assert_eq!(attendance_signals(A, A).length(), 0); // 자기 이벤트 제외
}

#[test_only]
fun E_INYEON_FOR_TEST(): u8 { 1 }
