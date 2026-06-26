/// Announcement(공지) — 혼주가 라운지에 올리는 공지사항.
/// TODO: Seal + Walrus 전환 시 message를 blob_id로 교체.
/// WeddingCap 보유자만 생성/삭제 가능.
module dibang_wedding::announcement;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::{Self, WeddingCap};

// === Errors ===
const ENotCreator: u64 = 0;
const EEmptyMessage: u64 = 1;

// === Structs ===

/// 라운지 공지. 공유 오브젝트.
/// TODO: Seal + Walrus 전환 시 message → blob_id(vector<u8>).
public struct Announcement has key {
    id: UID,
    wedding_id: ID,
    creator: address,
    message: String,
    is_pinned: bool,
    created_at_ms: u64,
}

// === Events ===

public struct AnnouncementCreated has copy, drop {
    announcement_id: ID,
    wedding_id: ID,
    message: String,
    creator: address,
}

public struct AnnouncementDeleted has copy, drop {
    announcement_id: ID,
}

// === Public functions ===

/// 공지 생성 — WeddingCap 보유 혼주만.
public fun create_announcement(
    cap: &WeddingCap,
    message: String,
    is_pinned: bool,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(message.length() > 0, EEmptyMessage);
    let wid = wedding::wedding_id(cap);
    let ann = Announcement {
        id: object::new(ctx),
        wedding_id: wid,
        creator: ctx.sender(),
        message,
        is_pinned,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&ann);
    event::emit(AnnouncementCreated { announcement_id: id, wedding_id: wid, message: ann.message, creator: ann.creator });
    transfer::share_object(ann);
    id
}

/// 공지 삭제 — 생성자만.
public fun delete_announcement(ann: Announcement, ctx: &TxContext) {
    assert!(ctx.sender() == ann.creator, ENotCreator);
    let Announcement { id, wedding_id: _, creator: _, message: _, is_pinned: _, created_at_ms: _ } = ann;
    event::emit(AnnouncementDeleted { announcement_id: object::uid_to_inner(&id) });
    object::delete(id);
}

// === Views ===

public fun announcement_wedding_id(ann: &Announcement): ID { ann.wedding_id }
public fun announcement_message(ann: &Announcement): String { ann.message }
public fun announcement_is_pinned(ann: &Announcement): bool { ann.is_pinned }
