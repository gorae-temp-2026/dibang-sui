/// Memory(메모리) — 라운지에 올리는 사진/영상 메모리.
/// TODO: Seal + Walrus 전환 시 photo_url/text를 blob_id로 교체.
/// 누구나 올릴 수 있음(하객 포함). soulbound(key-only).
module dibang_wedding::memory;

use std::string::String;
use sui::clock::Clock;
use sui::event;

// === Structs ===

/// 메모리 항목. soulbound — 작성자에 귀속.
/// TODO: Seal + Walrus 전환 시 text/photo_url → blob_id(vector<u8>).
public struct Memory has key {
    id: UID,
    wedding_id: ID,
    author: address,
    text: String,
    photo_url: String,
    created_at_ms: u64,
}

// === Events ===

public struct MemoryCreated has copy, drop {
    memory_id: ID,
    wedding_id: ID,
    author: address,
    text: String,
    photo_url: String,
    created_at_ms: u64,
}

// === Public functions ===

/// 메모리 작성 — 누구나 가능.
public fun create_memory(
    wedding_id: ID,
    text: String,
    photo_url: String,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    let mem = Memory {
        id: object::new(ctx),
        wedding_id,
        author: ctx.sender(),
        text,
        photo_url,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&mem);
    event::emit(MemoryCreated {
        memory_id: id,
        wedding_id,
        author: mem.author,
        text: mem.text,
        photo_url: mem.photo_url,
        created_at_ms: mem.created_at_ms,
    });
    transfer::transfer(mem, ctx.sender());
    id
}

// === Views ===

public fun memory_wedding_id(m: &Memory): ID { m.wedding_id }
public fun memory_author(m: &Memory): address { m.author }
public fun memory_text(m: &Memory): String { m.text }
public fun memory_photo_url(m: &Memory): String { m.photo_url }
