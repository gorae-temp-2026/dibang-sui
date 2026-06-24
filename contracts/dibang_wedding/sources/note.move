/// 쪽지(DM) 모듈 — Seal 암호화 + Walrus 저장 기반 1:1 비동기 메시징.
///
/// 흐름:
///   1) send_note: sender+receiver 2명짜리 NoteBox(allowlist)를 공유 → Seal 키 서버가 이 allowlist를
///      기준으로 복호화 허용. 쪽지 blob ID를 NoteSent 이벤트로 emit.
///   2) seal_approve: Seal 키 서버가 복호화 요청 시 호출 — NoteBox.participants에 caller가 있는지 확인.
///   3) 프론트: NoteSent 이벤트 조회 → Walrus에서 blob 다운로드 → Seal로 복호화.
module dibang_wedding::note;

// === Errors ===
const ENoAccess: u64 = 0;

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
    let note_box = NoteBox {
        id: object::new(ctx),
        participants: vector[sender, other],
    };
    let box_id = object::id(&note_box);
    sui::event::emit(NoteBoxCreated { note_box_id: box_id, participant_a: sender, participant_b: other });
    transfer::share_object(note_box);
    box_id
}

/// 쪽지 전송 — blob_id(Walrus에 저장된 암호화 메시지)를 이벤트로 기록.
/// NoteBox participants만 호출 가능(sender 확인).
public fun send_note(
    note_box: &NoteBox,
    to: address,
    blob_id: vector<u8>,
    clock: &sui::clock::Clock,
    ctx: &TxContext,
) {
    let sender = ctx.sender();
    assert!(note_box.participants.contains(&sender), ENoAccess);
    assert!(note_box.participants.contains(&to), ENoAccess);
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

fun is_prefix(prefix: vector<u8>, word: vector<u8>): bool {
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
    assert!(is_prefix(ns, id), ENoAccess);
    assert!(note_box.participants.contains(&ctx.sender()), ENoAccess);
}
