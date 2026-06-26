/// 쪽지(DM) 모듈 — 1:1 비동기 메시징 + 신뢰 신호(SEND_NOTE CS).
///
/// 흐름:
///   1) send_note: NoteBox participants 검증 → SEND_NOTE CS 신호 기록 → NoteSent 이벤트 emit.
///   2) seal_approve: Seal 키 서버가 복호화 요청 시 호출 — NoteBox.participants에 caller가 있는지 확인.
///   3) 프론트: NoteSent 이벤트 조회 → Walrus에서 blob 다운로드 → Seal로 복호화.
module dibang_wedding::note;

use dibang_wedding::ledger;
use dibang_wedding::trust_matrix;
use dibang_wedding::event as gathering;

// === Errors ===
const ENoAccess: u64 = 0;
const ESelfNote: u64 = 1;

// === Structs ===

/// 1:1 쪽지함 — sender+receiver 2명의 allowlist. Seal 접근 정책 역할.
public struct NoteBox has key {
    id: UID,
    participants: vector<address>,
}

// === Events ===

public struct NoteSent has copy, drop {
    note_box_id: ID,
    from: address,
    to: address,
    /// Walrus blob ID (암호화된 메시지가 저장된 blob).
    blob_id: vector<u8>,
    created_at_ms: u64,
}

public struct NoteBoxCreated has copy, drop {
    note_box_id: ID,
    participant_a: address,
    participant_b: address,
}

// === Functions ===

/// 1:1 쪽지함 생성 — sender와 receiver 2명을 participants로. 공유 오브젝트로 만들어 Seal이 접근 가능.
public fun create_note_box(other: address, ctx: &mut TxContext): ID {
    let sender = ctx.sender();
    assert!(sender != other, ESelfNote);
    let note_box = NoteBox {
        id: object::new(ctx),
        participants: vector[sender, other],
    };
    let box_id = object::id(&note_box);
    sui::event::emit(NoteBoxCreated { note_box_id: box_id, participant_a: sender, participant_b: other });
    transfer::share_object(note_box);
    box_id
}

/// 쪽지 전송 — blob_id(Walrus 메시지)를 이벤트로 기록 + SEND_NOTE CS 신호.
/// NoteBox participants만 호출 가능(sender 확인).
public fun send_note(
    note_box: &NoteBox,
    participation: &gathering::Participation,
    to: address,
    blob_id: vector<u8>,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    assert!(note_box.participants.contains(&sender), ENoAccess);
    assert!(note_box.participants.contains(&to), ENoAccess);
    ledger::log(participation, ledger::action_send_note(), option::some(to), 0, option::none(), matrix, clock, ctx);
    sui::event::emit(NoteSent {
        note_box_id: object::id(note_box),
        from: sender,
        to,
        blob_id,
        created_at_ms: sui::clock::timestamp_ms(clock),
    });
}

// === Seal 접근 제어 ===

/// Seal namespace = NoteBox ID bytes.
public fun namespace(note_box: &NoteBox): vector<u8> {
    note_box.id.to_bytes()
}

fun is_prefix(prefix: &vector<u8>, word: &vector<u8>): bool {
    if (prefix.length() > word.length()) { return false };
    let mut i = 0;
    while (i < prefix.length()) {
        if (prefix[i] != word[i]) { return false };
        i = i + 1;
    };
    true
}

/// Seal 키 서버가 복호화 요청 시 호출 — caller가 NoteBox participants에 있는지 확인.
entry fun seal_approve(id: vector<u8>, note_box: &NoteBox, ctx: &TxContext) {
    let ns = namespace(note_box);
    assert!(is_prefix(&ns, &id), ENoAccess);
    assert!(note_box.participants.contains(&ctx.sender()), ENoAccess);
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const SENDER: address = @0xA;
#[test_only]
const RECEIVER: address = @0xB;

#[test]
fun send_note_logs_send_note_action() {
    let mut scenario = ts::begin(SENDER);
    let clk = clock::create_for_testing(scenario.ctx());
    // 인연 이벤트 생성 (SENDER=INITIATOR).
    gathering::new_event(gathering::event_inyeon(), gathering::role_initiator(), &clk, scenario.ctx());

    // RECEIVER에게 RECEIVER 역할 부여 (ium 게이트 대용).
    scenario.next_tx(SENDER);
    let ev = scenario.take_shared<gathering::Event>();
    gathering::assign_role(&ev, RECEIVER, gathering::role_receiver(), &clk, scenario.ctx());
    ts::return_shared(ev);

    // NoteBox 생성.
    scenario.next_tx(SENDER);
    create_note_box(RECEIVER, scenario.ctx());

    // SENDER가 쪽지 전송.
    scenario.next_tx(SENDER);
    let note_box = scenario.take_shared<NoteBox>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    send_note(&note_box, &part, RECEIVER, b"hello", &mut mtx, &clk, scenario.ctx());
    assert_eq!(trust_matrix::pi_of(&mtx, RECEIVER), 138_750_000);
    destroy(mtx);
    scenario.return_to_sender(part);
    ts::return_shared(note_box);

    scenario.next_tx(SENDER);
    let rec = scenario.take_from_sender<ledger::ActionRecord>();
    assert_eq!(rec.action_type(), ledger::action_send_note());
    assert_eq!(rec.actor(), SENDER);
    assert_eq!(rec.target(), option::some(RECEIVER));
    scenario.return_to_sender(rec);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test, expected_failure(abort_code = ESelfNote)]
fun self_note_box_fails() {
    let mut scenario = ts::begin(SENDER);
    create_note_box(SENDER, scenario.ctx());
    abort
}
