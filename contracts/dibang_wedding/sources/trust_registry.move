/// TrustRegistry — 타입(kind,resource_id) → TrustMatrix 객체 ID 색인(라우팅).
///
/// ──────────────────────────────────────────────────────────────────────────────
/// 역할 (결정#42 라우팅 · 결정#45 초기화 · 설계서 §1)
/// ──────────────────────────────────────────────────────────────────────────────
/// 신호 한 개는 자기 타입의 TrustMatrix로 가야 한다. 그 "타입→어느 매트릭스 객체"를 온체인에 둔 색인이
/// 이 레지스트리다(자기기술적·온체인 SSOT). **주의:** Sui는 tx가 건드릴 shared object를 미리 입력으로
/// 받아야 하므로, 레지스트리는 *ID 조회용*이다 — PTB가 `matrix_id()`로 ID를 얻은 뒤 그 매트릭스 객체를
/// 트랜잭션 입력으로 넣는다(레지스트리에서 객체를 "꺼내" 쓰는 게 아님).
///
/// **초기화(결정#45):** `bootstrap()`이 표준 매트릭스(EM-money, CS)를 1회 생성·공유하고 레지스트리에 등록한다.
/// backfill은 하지 않는다 — 생성 시점부터 집계(과거 영수증 replay가 필요하면 별도 도구). 새 EM 자원이 생기면
/// `add_matrix()`로 추가한다(기존 타입 덮어쓰기는 막아 라우팅 하이재킹 차단; 권한 게이트는 후속).
///
/// owned 아님 → shared.
module dibang_wedding::trust_registry;

use sui::event;
use sui::vec_map::{Self, VecMap};
use dibang_wedding::trust_matrix;

// === Errors ===
/// 이미 등록된 타입 키(덮어쓰기 금지 — 라우팅 하이재킹 차단).
const ETypeExists: u64 = 0;
/// 등록되지 않은 타입 키 조회.
const ETypeNotFound: u64 = 1;

/// EM 돈 자원 id(=0, signal::resource_money() 미러). 표준 매트릭스 부트스트랩용.
const RESOURCE_MONEY: u8 = 0;

// === Structs ===

/// 타입 키(u16 = trust_matrix::type_key) → TrustMatrix 객체 ID 색인.
public struct TrustRegistry has key {
    id: UID,
    matrices: VecMap<u16, ID>,
}

// === Events ===

public struct RegistryCreated has copy, drop {
    registry_id: ID,
}

public struct MatrixRegistered has copy, drop {
    registry_id: ID,
    type_key: u16,
    matrix_id: ID,
}

// === Public functions ===

/// 표준 매트릭스(EM-money, CS)를 생성·공유하고 레지스트리에 등록한 뒤 레지스트리를 공유한다(1회 부트스트랩).
/// 레지스트리 ID 반환. 과거 영수증 backfill 없음(생성 시점부터 집계).
public fun bootstrap(ctx: &mut TxContext): ID {
    let mut matrices = vec_map::empty<u16, ID>();

    // EM-부조(돈) 매트릭스.
    let em_money = trust_matrix::new_matrix(trust_matrix::kind_em(), RESOURCE_MONEY, ctx);
    matrices.insert(trust_matrix::type_key(trust_matrix::kind_em(), RESOURCE_MONEY), em_money);

    // CS(유대) 매트릭스. CS는 자원 무관 → resource_id 0.
    let cs = trust_matrix::new_matrix(trust_matrix::kind_cs(), 0, ctx);
    matrices.insert(trust_matrix::type_key(trust_matrix::kind_cs(), 0), cs);

    let reg = TrustRegistry { id: object::new(ctx), matrices };
    let registry_id = object::id(&reg);
    event::emit(RegistryCreated { registry_id });
    event::emit(MatrixRegistered { registry_id, type_key: trust_matrix::type_key(trust_matrix::kind_em(), RESOURCE_MONEY), matrix_id: em_money });
    event::emit(MatrixRegistered { registry_id, type_key: trust_matrix::type_key(trust_matrix::kind_cs(), 0), matrix_id: cs });
    transfer::share_object(reg);
    registry_id
}

/// 새 타입 매트릭스를 생성·공유하고 레지스트리에 등록한다(새 EM 자원 등). 이미 있으면 abort(덮어쓰기 금지).
/// 매트릭스 ID 반환. (권한 게이트는 후속 — 현재는 누구나 *새* 타입 추가만 가능, 기존 변경 불가.)
public fun add_matrix(reg: &mut TrustRegistry, kind: u8, resource_id: u8, ctx: &mut TxContext): ID {
    let key = trust_matrix::type_key(kind, resource_id);
    assert!(!reg.matrices.contains(&key), ETypeExists);
    let mid = trust_matrix::new_matrix(kind, resource_id, ctx);
    reg.matrices.insert(key, mid);
    event::emit(MatrixRegistered { registry_id: object::id(reg), type_key: key, matrix_id: mid });
    mid
}

// === Views ===

/// (kind, resource_id) 타입의 매트릭스 ID. 없으면 abort. PTB가 이 ID로 매트릭스 객체를 tx 입력에 넣는다.
public fun matrix_id(reg: &TrustRegistry, kind: u8, resource_id: u8): ID {
    let key = trust_matrix::type_key(kind, resource_id);
    assert!(reg.matrices.contains(&key), ETypeNotFound);
    *reg.matrices.get(&key)
}

/// 해당 타입이 등록돼 있나.
public fun has_type(reg: &TrustRegistry, kind: u8, resource_id: u8): bool {
    reg.matrices.contains(&trust_matrix::type_key(kind, resource_id))
}

/// 등록된 타입 수.
public fun type_count(reg: &TrustRegistry): u64 { reg.matrices.length() }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use std::unit_test::assert_eq;

#[test_only]
const ADMIN: address = @0xAD;

#[test]
fun bootstrap_registers_standard_matrices() {
    let mut scenario = ts::begin(ADMIN);
    let registry_id = bootstrap(scenario.ctx());

    scenario.next_tx(ADMIN);
    let reg = scenario.take_shared<TrustRegistry>();
    assert_eq!(object::id(&reg), registry_id);
    // EM-money + CS 두 타입 등록.
    assert_eq!(type_count(&reg), 2);
    assert!(has_type(&reg, trust_matrix::kind_em(), 0));
    assert!(has_type(&reg, trust_matrix::kind_cs(), 0));

    // 등록된 ID가 실제 공유된 매트릭스를 가리키고 kind가 맞는지.
    let em_id = matrix_id(&reg, trust_matrix::kind_em(), 0);
    let em = scenario.take_shared_by_id<trust_matrix::TrustMatrix>(em_id);
    assert_eq!(trust_matrix::kind(&em), trust_matrix::kind_em());
    ts::return_shared(em);

    let cs_id = matrix_id(&reg, trust_matrix::kind_cs(), 0);
    let cs = scenario.take_shared_by_id<trust_matrix::TrustMatrix>(cs_id);
    assert_eq!(trust_matrix::kind(&cs), trust_matrix::kind_cs());
    ts::return_shared(cs);

    ts::return_shared(reg);
    scenario.end();
}

#[test]
fun add_matrix_registers_new_type() {
    let mut scenario = ts::begin(ADMIN);
    bootstrap(scenario.ctx());

    scenario.next_tx(ADMIN);
    let mut reg = scenario.take_shared<TrustRegistry>();
    // 새 EM 자원(노동=1) 추가.
    let labor_id = add_matrix(&mut reg, trust_matrix::kind_em(), 1, scenario.ctx());
    assert_eq!(type_count(&reg), 3);
    assert_eq!(matrix_id(&reg, trust_matrix::kind_em(), 1), labor_id);
    ts::return_shared(reg);
    scenario.end();
}

#[test, expected_failure(abort_code = ETypeExists)]
fun add_existing_type_fails() {
    let mut scenario = ts::begin(ADMIN);
    bootstrap(scenario.ctx());

    scenario.next_tx(ADMIN);
    let mut reg = scenario.take_shared<TrustRegistry>();
    add_matrix(&mut reg, trust_matrix::kind_em(), 0, scenario.ctx()); // 이미 있음(EM-money) → abort
    ts::return_shared(reg);
    scenario.end();
}

#[test, expected_failure(abort_code = ETypeNotFound)]
fun matrix_id_unknown_type_fails() {
    let mut scenario = ts::begin(ADMIN);
    bootstrap(scenario.ctx());

    scenario.next_tx(ADMIN);
    let reg = scenario.take_shared<TrustRegistry>();
    matrix_id(&reg, trust_matrix::kind_em(), 9); // 자원 9 미등록 → abort
    ts::return_shared(reg);
    scenario.end();
}
