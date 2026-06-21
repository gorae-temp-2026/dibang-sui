/// Invitation(청첩장) — 모바일 청첩장 콘텐츠를 온체인에 저장한다.
/// TODO: Seal 암호화 + Walrus blob 저장으로 전환 예정. 현재는 평문 저장(MVP).
/// 청첩장은 Wedding 1:N(한 결혼식에 여러 디자인). 공유 오브젝트.
module dibang_wedding::invitation;

use std::string::String;
use sui::clock::Clock;
use sui::event;

// === Errors ===
const ENotCreator: u64 = 0;

// === Structs ===

/// 모바일 청첩장. 공유 오브젝트 — 누구나 조회(공개 링크).
/// TODO: Seal + Walrus 전환 시 본문 필드를 blob_id(vector<u8>)로 교체.
public struct Invitation has key {
    id: UID,
    wedding_id: ID,
    creator: address,
    slug: String,
    groom_name: String,
    bride_name: String,
    date: String,
    time: String,
    venue_name: String,
    venue_hall: String,
    cover_photo_url: String,
    greeting: String,
    created_at_ms: u64,
}

// === Events ===

public struct InvitationCreated has copy, drop {
    invitation_id: ID,
    wedding_id: ID,
    slug: String,
    creator: address,
}

public struct InvitationUpdated has copy, drop {
    invitation_id: ID,
}

// === Public functions ===

/// 청첩장 생성 — Wedding에 연결. 표시 콘텐츠 평문 저장(MVP).
public fun create_invitation(
    wedding_id: ID,
    slug: String,
    groom_name: String,
    bride_name: String,
    date: String,
    time: String,
    venue_name: String,
    venue_hall: String,
    cover_photo_url: String,
    greeting: String,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    let inv = Invitation {
        id: object::new(ctx),
        wedding_id,
        creator: ctx.sender(),
        slug,
        groom_name,
        bride_name,
        date,
        time,
        venue_name,
        venue_hall,
        cover_photo_url,
        greeting,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&inv);
    event::emit(InvitationCreated { invitation_id: id, wedding_id, slug: inv.slug, creator: inv.creator });
    transfer::share_object(inv);
    id
}

/// 청첩장 수정 — 생성자만 가능.
public fun update_invitation(
    inv: &mut Invitation,
    groom_name: String,
    bride_name: String,
    date: String,
    time: String,
    venue_name: String,
    venue_hall: String,
    cover_photo_url: String,
    greeting: String,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == inv.creator, ENotCreator);
    inv.groom_name = groom_name;
    inv.bride_name = bride_name;
    inv.date = date;
    inv.time = time;
    inv.venue_name = venue_name;
    inv.venue_hall = venue_hall;
    inv.cover_photo_url = cover_photo_url;
    inv.greeting = greeting;
    event::emit(InvitationUpdated { invitation_id: object::id(inv) });
}

// === Views ===

public fun invitation_wedding_id(inv: &Invitation): ID { inv.wedding_id }
public fun invitation_slug(inv: &Invitation): String { inv.slug }
public fun invitation_groom(inv: &Invitation): String { inv.groom_name }
public fun invitation_bride(inv: &Invitation): String { inv.bride_name }
public fun invitation_date(inv: &Invitation): String { inv.date }
public fun invitation_time(inv: &Invitation): String { inv.time }
public fun invitation_venue(inv: &Invitation): String { inv.venue_name }
public fun invitation_hall(inv: &Invitation): String { inv.venue_hall }
public fun invitation_cover(inv: &Invitation): String { inv.cover_photo_url }
public fun invitation_greeting(inv: &Invitation): String { inv.greeting }
