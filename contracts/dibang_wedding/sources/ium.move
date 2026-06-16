/// Ium 도메인 — 사용자 간 신뢰 관계(이음)를 온체인 오브젝트로 구현한다.
/// 각 관계는 소유 가능한 `Ium` 오브젝트로 표현되고, 공유 `IumRegistry`가 (from, to)
/// 쌍을 dynamic field로 추적해 자기 자신 링크와 중복 관계를 막는다.
module dibang_wedding::ium;

use std::string::String;
use sui::clock::Clock;
use sui::dynamic_field as df;
use sui::event;

// === Errors ===

/// 자기 자신과는 관계를 맺을 수 없음.
const ESelfLink: u64 = 0;
/// 이미 존재하는 (from, to) 관계임.
const EDuplicateIum: u64 = 1;

// === Structs ===

/// 신뢰 관계 한 건. `key + store`라 보관·전송 가능하다.
public struct Ium has key, store {
    id: UID,
    from_user: address,
    to_user: address,
    relation_type: String,
    label: String,
    created_at: u64,
}

/// 중복 관계 방지용 공유 레지스트리. (from, to) 쌍을 dynamic field 키로 기록한다.
public struct IumRegistry has key {
    id: UID,
}

/// (from, to) 쌍을 가리키는 dynamic field 키.
public struct PairKey has copy, drop, store {
    from: address,
    to: address,
}

// === Events ===

public struct IumCreated has copy, drop {
    ium_id: ID,
    from_user: address,
    to_user: address,
    relation_type: String,
}

public struct IumRevoked has copy, drop {
    ium_id: ID,
    from_user: address,
    to_user: address,
}

// === Init ===

/// 패키지 배포 시 1회 실행되어 공유 레지스트리를 만든다.
fun init(ctx: &mut TxContext) {
    transfer::share_object(IumRegistry { id: object::new(ctx) });
}

// === Public functions ===

/// 호출자(from)가 `to_user`에게 신뢰 관계를 만든다. 자기 자신·중복 쌍은 거부한다.
/// 생성된 `Ium`을 반환해 PTB가 호출자에게 transfer 하도록 한다.
public fun create_ium(
    registry: &mut IumRegistry,
    to_user: address,
    relation_type: String,
    label: String,
    clock: &Clock,
    ctx: &mut TxContext,
): Ium {
    let from_user = ctx.sender();
    assert!(from_user != to_user, ESelfLink);

    let key = PairKey { from: from_user, to: to_user };
    assert!(!df::exists_(&registry.id, key), EDuplicateIum);
    df::add(&mut registry.id, key, true);

    let ium = Ium {
        id: object::new(ctx),
        from_user,
        to_user,
        relation_type,
        label,
        created_at: clock.timestamp_ms(),
    };

    event::emit(IumCreated {
        ium_id: object::id(&ium),
        from_user,
        to_user,
        relation_type: ium.relation_type,
    });

    ium
}

/// 신뢰 관계를 취소한다. `Ium` 오브젝트를 소비하고 레지스트리에서 쌍을 제거해
/// 같은 쌍을 다시 만들 수 있게 한다.
public fun revoke_ium(registry: &mut IumRegistry, ium: Ium) {
    let ium_id = object::id(&ium);
    let Ium { id, from_user, to_user, relation_type: _, label: _, created_at: _ } = ium;

    let key = PairKey { from: from_user, to: to_user };
    let _existed: bool = df::remove(&mut registry.id, key);

    event::emit(IumRevoked { ium_id, from_user, to_user });
    id.delete();
}

// === Views ===

public fun from_user(ium: &Ium): address { ium.from_user }
public fun to_user(ium: &Ium): address { ium.to_user }
public fun relation_type(ium: &Ium): String { ium.relation_type }
public fun label(ium: &Ium): String { ium.label }

/// 레지스트리에 (from, to) 관계가 존재하는지.
public fun has_relation(registry: &IumRegistry, from: address, to: address): bool {
    df::exists_(&registry.id, PairKey { from, to })
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const ALICE: address = @0xA1;
#[test_only]
const BOB: address = @0xB0;

#[test_only]
/// 테스트에서 레지스트리를 만든다(배포 시 init과 동일).
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test]
fun create_ium_marks_registry() {
    let mut scenario = ts::begin(ALICE);
    init_for_testing(scenario.ctx());

    scenario.next_tx(ALICE);
    let mut registry = scenario.take_shared<IumRegistry>();
    let clock = clock::create_for_testing(scenario.ctx());

    let ium = create_ium(
        &mut registry,
        BOB,
        b"friend".to_string(),
        b"Best friend".to_string(),
        &clock,
        scenario.ctx(),
    );

    assert_eq!(ium.from_user, ALICE);
    assert_eq!(ium.to_user, BOB);
    assert!(registry.has_relation(ALICE, BOB));
    assert!(!registry.has_relation(BOB, ALICE)); // 방향성 있음

    transfer::public_transfer(ium, ALICE);
    clock::destroy_for_testing(clock);
    ts::return_shared(registry);
    scenario.end();
}

#[test]
fun revoke_allows_recreate() {
    let mut scenario = ts::begin(ALICE);
    init_for_testing(scenario.ctx());

    // 생성
    scenario.next_tx(ALICE);
    {
        let mut registry = scenario.take_shared<IumRegistry>();
        let clock = clock::create_for_testing(scenario.ctx());
        let ium = create_ium(&mut registry, BOB, b"friend".to_string(), b"x".to_string(), &clock, scenario.ctx());
        transfer::public_transfer(ium, ALICE);
        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    // 취소 후 같은 쌍 재생성
    scenario.next_tx(ALICE);
    {
        let mut registry = scenario.take_shared<IumRegistry>();
        let ium = scenario.take_from_sender<Ium>();
        revoke_ium(&mut registry, ium);
        assert!(!registry.has_relation(ALICE, BOB));

        let clock = clock::create_for_testing(scenario.ctx());
        let ium2 = create_ium(&mut registry, BOB, b"friend".to_string(), b"again".to_string(), &clock, scenario.ctx());
        assert!(registry.has_relation(ALICE, BOB));
        transfer::public_transfer(ium2, ALICE);
        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = ESelfLink)]
fun self_link_fails() {
    let mut scenario = ts::begin(ALICE);
    init_for_testing(scenario.ctx());

    scenario.next_tx(ALICE);
    let mut registry = scenario.take_shared<IumRegistry>();
    let clock = clock::create_for_testing(scenario.ctx());

    let ium = create_ium(&mut registry, ALICE, b"friend".to_string(), b"self".to_string(), &clock, scenario.ctx());

    transfer::public_transfer(ium, ALICE); // 미도달
    clock::destroy_for_testing(clock);
    ts::return_shared(registry);
    scenario.end();
}

#[test, expected_failure(abort_code = EDuplicateIum)]
fun duplicate_ium_fails() {
    let mut scenario = ts::begin(ALICE);
    init_for_testing(scenario.ctx());

    scenario.next_tx(ALICE);
    let mut registry = scenario.take_shared<IumRegistry>();
    let clock = clock::create_for_testing(scenario.ctx());

    let ium1 = create_ium(&mut registry, BOB, b"friend".to_string(), b"x".to_string(), &clock, scenario.ctx());
    let ium2 = create_ium(&mut registry, BOB, b"friend".to_string(), b"dup".to_string(), &clock, scenario.ctx()); // EDuplicateIum

    transfer::public_transfer(ium1, ALICE); // 미도달
    transfer::public_transfer(ium2, ALICE);
    clock::destroy_for_testing(clock);
    ts::return_shared(registry);
    scenario.end();
}
