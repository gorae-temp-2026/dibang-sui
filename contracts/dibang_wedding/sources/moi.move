/// Moi 도메인 — 사용자의 아바타(`Moi`)와 장착 아이템(`MoiItem`)을 오브젝트로 구현한다.
/// `Moi`는 소유 오브젝트라 소유자만 변경할 수 있고(소유 = 권한), 아이템은 슬롯별로
/// dynamic object field에 보관되며 `equipped` VecMap이 slot→item_id 인덱스를 유지해
/// 온체인·오프체인 모두에서 장착 현황을 쉽게 조회할 수 있게 한다.
module dibang_wedding::moi;

use std::string::String;
use sui::dynamic_object_field as dof;
use sui::event;
use sui::vec_map::{Self, VecMap};

// === Errors ===

/// 해당 슬롯에 이미 아이템이 장착되어 있음.
const ESlotOccupied: u64 = 0;
/// 해당 슬롯이 비어 있음(해제할 아이템 없음).
const ESlotEmpty: u64 = 1;

// === Structs ===

/// 사용자 아바타. 소유 오브젝트이며 `equipped`는 slot → item_id 인덱스다.
/// 실제 아이템 오브젝트는 slot 문자열을 키로 한 dynamic object field에 보관된다.
public struct Moi has key {
    id: UID,
    owner: address,
    equipped: VecMap<String, ID>,
}

/// 아바타 장착 아이템. `key + store`라 거래·전송 가능한 NFT다.
public struct MoiItem has key, store {
    id: UID,
    name: String,
    item_type: String,
    slot: String,
}

// === Events ===

public struct MoiCreated has copy, drop {
    moi_id: ID,
    owner: address,
}

public struct ItemMinted has copy, drop {
    item_id: ID,
    item_type: String,
    slot: String,
}

public struct ItemEquipped has copy, drop {
    moi_id: ID,
    item_id: ID,
    slot: String,
}

public struct ItemUnequipped has copy, drop {
    moi_id: ID,
    item_id: ID,
    slot: String,
}

// === Public functions ===

/// 아바타를 생성해 `recipient`에게 전달한다.
///
/// `Moi`는 사용자 정체성에 귀속되는 soulbound 오브젝트라 `store` 능력이 없다
/// (원본 스키마의 user_id UNIQUE = 사용자당 1개, 거래 대상 아님). 따라서 PTB의
/// `TransferObjects`로 옮길 수 없어 모듈이 직접 transfer 한다. recipient를 명시 인자로
/// 받아(보통 호출자 본인 주소) self-transfer lint를 피하고 호출 의도를 분명히 한다.
public fun create_moi(recipient: address, ctx: &mut TxContext) {
    let moi = Moi {
        id: object::new(ctx),
        owner: recipient,
        equipped: vec_map::empty(),
    };
    event::emit(MoiCreated { moi_id: object::id(&moi), owner: recipient });
    transfer::transfer(moi, recipient);
}

/// 아이템을 발행해 반환한다. PTB가 호출자에게 transfer 한다.
///
/// ⚠️ 현재 `public` + 무료·무게이트(샵 경제 그린필드, YONE=결정#6 대기) — 누구나 MoiItem을 무한 발행 가능.
/// gift::gift가 MoiItem 이전 + GIFT(CS 신호)를 찍으므로 **무료 발행 + 선물 = CS 시빌 농사** 벡터다(L8).
/// §3-G가 의도한 "구매=SUI/YONE 비용"으로 샵이 발행을 게이트하기 전까지 **gift-CS는 신뢰하면 안 된다**
/// (인덱서/Φ가 gift-CS 할인 또는 mint를 public(package)로 봉인+샵 모듈 경유로 전환). 신호 무결성=행위 비용.
public fun mint_item(
    name: String,
    item_type: String,
    slot: String,
    ctx: &mut TxContext,
): MoiItem {
    let item = MoiItem { id: object::new(ctx), name, item_type, slot };
    event::emit(ItemMinted {
        item_id: object::id(&item),
        item_type: item.item_type,
        slot: item.slot,
    });
    item
}

/// 아이템을 아바타의 슬롯에 장착한다. 같은 슬롯이 이미 차 있으면 abort.
/// 아이템은 슬롯 키의 dynamic object field로 보관되고, `equipped` 인덱스에도 기록된다.
public fun equip_item(moi: &mut Moi, item: MoiItem) {
    let slot = item.slot;
    assert!(!moi.equipped.contains(&slot), ESlotOccupied);

    let item_id = object::id(&item);
    let moi_id = object::id(moi);

    moi.equipped.insert(slot, item_id);
    dof::add(&mut moi.id, slot, item);

    event::emit(ItemEquipped { moi_id, item_id, slot });
}

/// 슬롯에서 아이템을 해제해 반환한다. PTB가 소유자에게 돌려준다. 비어 있으면 abort.
public fun unequip_item(moi: &mut Moi, slot: String): MoiItem {
    assert!(moi.equipped.contains(&slot), ESlotEmpty);

    let (_, item_id) = moi.equipped.remove(&slot);
    let item: MoiItem = dof::remove(&mut moi.id, slot);

    event::emit(ItemUnequipped { moi_id: object::id(moi), item_id, slot });
    item
}

// === Views ===

public fun owner(moi: &Moi): address { moi.owner }
public fun equipped(moi: &Moi): VecMap<String, ID> { moi.equipped }
public fun is_slot_equipped(moi: &Moi, slot: &String): bool { moi.equipped.contains(slot) }
public fun item_name(item: &MoiItem): String { item.name }
public fun item_type(item: &MoiItem): String { item.item_type }
public fun item_slot(item: &MoiItem): String { item.slot }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const USER: address = @0x6;

#[test_only]
/// 단위 테스트용 — Moi를 반환한다(production `create_moi`는 sender에게 transfer).
public fun new_moi_for_testing(ctx: &mut TxContext): Moi {
    Moi { id: object::new(ctx), owner: ctx.sender(), equipped: vec_map::empty() }
}

#[test]
fun create_moi_transfers_to_sender() {
    let mut scenario = ts::begin(USER);
    create_moi(USER, scenario.ctx());

    scenario.next_tx(USER);
    let moi = scenario.take_from_sender<Moi>();
    assert_eq!(moi.owner, USER);
    assert!(moi.equipped.is_empty());

    scenario.return_to_sender(moi);
    scenario.end();
}

#[test]
fun mint_item_sets_fields() {
    let mut ctx = tx_context::dummy();
    let item = mint_item(b"Top Hat".to_string(), b"head".to_string(), b"head_slot".to_string(), &mut ctx);
    assert_eq!(item.name, b"Top Hat".to_string());
    assert_eq!(item.slot, b"head_slot".to_string());
    destroy(item);
}

#[test]
fun equip_then_unequip() {
    let mut ctx = tx_context::dummy();
    let mut moi = new_moi_for_testing(&mut ctx);
    let item = mint_item(b"Top Hat".to_string(), b"head".to_string(), b"head_slot".to_string(), &mut ctx);
    let item_id = object::id(&item);

    equip_item(&mut moi, item);
    assert!(moi.is_slot_equipped(&b"head_slot".to_string()));
    assert_eq!(moi.equipped.length(), 1);

    let back = unequip_item(&mut moi, b"head_slot".to_string());
    assert_eq!(object::id(&back), item_id);
    assert!(moi.equipped.is_empty());

    destroy(back);
    destroy(moi);
}

#[test, expected_failure(abort_code = ESlotOccupied)]
fun equip_occupied_slot_fails() {
    let mut ctx = tx_context::dummy();
    let mut moi = new_moi_for_testing(&mut ctx);
    let item1 = mint_item(b"Hat".to_string(), b"head".to_string(), b"head_slot".to_string(), &mut ctx);
    let item2 = mint_item(b"Cap".to_string(), b"head".to_string(), b"head_slot".to_string(), &mut ctx);

    equip_item(&mut moi, item1);
    equip_item(&mut moi, item2); // 같은 슬롯 → ESlotOccupied

    destroy(moi); // 미도달 — 컴파일 위한 소비
}

#[test, expected_failure(abort_code = ESlotEmpty)]
fun unequip_empty_slot_fails() {
    let mut ctx = tx_context::dummy();
    let mut moi = new_moi_for_testing(&mut ctx);

    let item = unequip_item(&mut moi, b"head_slot".to_string()); // 빈 슬롯 → ESlotEmpty

    destroy(item); // 미도달 — 컴파일 위한 소비
    destroy(moi);
}
