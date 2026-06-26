/// EdgeBalance — 두 사람(A,B) 사이의 *쌍-국소* 신뢰 잔액(2층 fold)을 담는 공유 오브젝트.
///
/// ──────────────────────────────────────────────────────────────────────────────
/// 역할 (설계서 `_architecture/ONCHAIN_TRUST_MATRIX_DESIGN.md` 2층)
/// ──────────────────────────────────────────────────────────────────────────────
/// 한 쌍(A,B)의 타입별 *방향 누적*을 보관한다. 두 사람 사이 첫 상호작용 때 lazy 생성한다.
/// fold는 쌍만 보면 되는 국소 연산이라(설계 §1 표) 이 객체는 자기 완결적이다.
///
/// **3층(TrustMatrix)과의 관계 — "엣지 갱신 함수가 전파 행렬도 같이 갱신":**
/// `record()`가 한 tx 안에서 ① 이 엣지 객체에 fold하고 ② 같은 타입의 TrustMatrix에 신호를 흘려
/// 재전파시킨다. 즉 2층 갱신과 3층 전파가 한 호출로 묶인다(사용자 설계 의도 그대로).
///
/// **방향 표현:** 객체는 두 참여자 `p0`,`p1`을 고정으로 들고, 타입마다 `(p0→p1, p1→p0)` 두 방향을
/// 따로 누적한다(EM net 상쇄·CS 방향독립 둘 다 방향이 필요 — 07). 같은 쌍이면 항상 같은 EdgeBalance를
/// 쓴다(어느 객체가 그 쌍인지의 *조회*는 오프체인 인덱스 — 인프라라 범위 밖).
///
/// **타입 키:** (kind, resource_id)를 u16으로 팩(`kind<<8 | resource_id`). TrustMatrix의 타입과 1:1.
///
/// **owned 아님 → shared**(설계 결정). 활동/관계 기록 성격이지만 1층 ActionRecord(soulbound)와 달리
/// 다자가 갱신·조회하는 누적 상태라 공유 오브젝트가 맞다(전파 매트릭스와 같은 결).
module dibang_wedding::edge_balance;

use sui::event;
use sui::vec_map::{Self, VecMap};
use dibang_wedding::trust_matrix::{Self, TrustMatrix};

// === Errors ===
/// from/to가 이 엣지의 두 참여자(p0,p1) 쌍이 아님.
const ENotParticipant: u64 = 0;
/// 넘긴 TrustMatrix의 (kind,resource_id)가 기록하려는 타입과 다름.
const EMatrixTypeMismatch: u64 = 1;
/// 자기 자신과의 엣지는 만들 수 없음.
const ESelfEdge: u64 = 2;

// === Structs ===

/// 한 타입의 양방향 누적값. p0→p1 / p1→p0 따로(방향 보존).
public struct DirPair has store, copy, drop {
    p0_to_p1: u64,
    p1_to_p0: u64,
}

/// 두 사람(p0,p1) 사이 신뢰 잔액. 타입(u16)별 DirPair 누적.
public struct EdgeBalance has key {
    id: UID,
    p0: address,
    p1: address,
    balances: VecMap<u16, DirPair>,
}

// === Events ===

public struct EdgeCreated has copy, drop {
    edge_id: ID,
    p0: address,
    p1: address,
}

public struct EdgeRecorded has copy, drop {
    edge_id: ID,
    from: address,
    to: address,
    type_key: u16,
    magnitude: u64,
}

// === 타입 키 ===

/// (kind, resource_id) → u16 팩 키. 단일 정의처는 trust_matrix::type_key(중복 방지).
public fun type_key(kind: u8, resource_id: u8): u16 {
    trust_matrix::type_key(kind, resource_id)
}

// === Public functions ===

/// 두 사람 사이 EdgeBalance를 만들어 공유한다(첫 상호작용 시 1회). 엣지 ID 반환.
public fun create_edge(p0: address, p1: address, ctx: &mut TxContext): ID {
    assert!(p0 != p1, ESelfEdge);
    let edge = EdgeBalance {
        id: object::new(ctx),
        p0,
        p1,
        balances: vec_map::empty(),
    };
    let id = object::id(&edge);
    event::emit(EdgeCreated { edge_id: id, p0, p1 });
    transfer::share_object(edge);
    id
}

/// 신호 한 건을 기록한다: ① 이 엣지(from→to 방향)에 magnitude를 fold하고 ② 같은 타입 TrustMatrix를
/// 재전파시킨다(2층+3층 한 tx). from/to는 이 엣지의 두 참여자여야 하고, matrix의 타입이 (kind,resource_id)와
/// 일치해야 한다.
public fun record(
    edge: &mut EdgeBalance,
    matrix: &mut TrustMatrix,
    from: address,
    to: address,
    kind: u8,
    resource_id: u8,
    magnitude: u64,
) {
    // 방향이 이 쌍 안의 것이어야 함(p0↔p1).
    assert!(
        (from == edge.p0 && to == edge.p1) || (from == edge.p1 && to == edge.p0),
        ENotParticipant,
    );
    // 넘긴 매트릭스가 바로 이 타입의 매트릭스여야 함(엉뚱한 타입에 흘리는 것 차단).
    assert!(
        trust_matrix::kind(matrix) == kind && trust_matrix::resource_id(matrix) == resource_id,
        EMatrixTypeMismatch,
    );

    // ① 2층 fold — 방향별 누적.
    let key = type_key(kind, resource_id);
    if (!edge.balances.contains(&key)) {
        edge.balances.insert(key, DirPair { p0_to_p1: 0, p1_to_p0: 0 });
    };
    let dp = edge.balances.get_mut(&key);
    if (from == edge.p0) {
        dp.p0_to_p1 = dp.p0_to_p1 + magnitude;
    } else {
        dp.p1_to_p0 = dp.p1_to_p0 + magnitude;
    };

    // ② 3층 전파 — 같은 신호를 매트릭스에 흘려 재전파(apply_signal이 magnitude>0·노드등록·propagate 처리).
    trust_matrix::apply_signal(matrix, from, to, magnitude);

    event::emit(EdgeRecorded { edge_id: object::id(edge), from, to, type_key: key, magnitude });
}

// === Views ===

/// 이 엣지의 두 참여자 주소 쌍.
public fun participants(edge: &EdgeBalance): (address, address) { (edge.p0, edge.p1) }

/// from→to 방향의 타입별 누적값(없으면 0).
public fun balance(edge: &EdgeBalance, from: address, to: address, kind: u8, resource_id: u8): u64 {
    let key = type_key(kind, resource_id);
    if (!edge.balances.contains(&key)) return 0;
    let dp = edge.balances.get(&key);
    if (from == edge.p0 && to == edge.p1) dp.p0_to_p1
    else if (from == edge.p1 && to == edge.p0) dp.p1_to_p0
    else 0
}

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const A: address = @0xA;
#[test_only]
const B: address = @0xB;

#[test_only]
/// 공유 안 하고 EdgeBalance 반환(record 단위 테스트용).
public fun new_for_testing(p0: address, p1: address, ctx: &mut TxContext): EdgeBalance {
    EdgeBalance { id: object::new(ctx), p0, p1, balances: vec_map::empty() }
}

#[test]
fun type_key_packs_kind_and_resource() {
    // EM(1) + 자원 0 = 0x0100 = 256.
    assert_eq!(type_key(1, 0), 256);
    // CS(2) + 자원 0 = 0x0200 = 512.
    assert_eq!(type_key(2, 0), 512);
    // EM(1) + 자원 3 = 0x0103 = 259.
    assert_eq!(type_key(1, 3), 259);
}

#[test]
/// record가 엣지에 fold하고 동시에 매트릭스를 재전파한다(부조: 베푼 A가 신용↑).
fun record_folds_edge_and_propagates_matrix() {
    let mut ctx = tx_context::dummy();
    let mut edge = new_for_testing(A, B, &mut ctx);
    let em = trust_matrix::kind_em();
    let mut m = trust_matrix::new_for_testing(em, 0, &mut ctx);

    record(&mut edge, &mut m, A, B, em, 0, 100);

    // ① 엣지: A→B=100, B→A=0
    assert_eq!(balance(&edge, A, B, em, 0), 100);
    assert_eq!(balance(&edge, B, A, em, 0), 0);
    // ② 매트릭스: 베푼 쪽 A가 받는 쪽 B보다 신용↑(2노드 부조 정확값)
    assert_eq!(trust_matrix::pi_of(&m, A), 138_750_000);
    assert_eq!(trust_matrix::pi_of(&m, B), 75_000_000);

    destroy(edge);
    destroy(m);
}

#[test]
/// 역방향 기록 — p1→p0 누적이 별도로 쌓인다.
fun record_reverse_direction() {
    let mut ctx = tx_context::dummy();
    let mut edge = new_for_testing(A, B, &mut ctx);
    let cs = trust_matrix::kind_cs();
    let mut m = trust_matrix::new_for_testing(cs, 0, &mut ctx);

    record(&mut edge, &mut m, A, B, cs, 0, 1);
    record(&mut edge, &mut m, B, A, cs, 0, 1);

    assert_eq!(balance(&edge, A, B, cs, 0), 1);
    assert_eq!(balance(&edge, B, A, cs, 0), 1);
    destroy(edge);
    destroy(m);
}

#[test, expected_failure(abort_code = ENotParticipant)]
fun rejects_non_participant() {
    let mut ctx = tx_context::dummy();
    let mut edge = new_for_testing(A, B, &mut ctx);
    let em = trust_matrix::kind_em();
    let mut m = trust_matrix::new_for_testing(em, 0, &mut ctx);
    record(&mut edge, &mut m, A, @0xCAFE, em, 0, 100); // @0xCAFE는 이 쌍 아님
    destroy(edge);
    destroy(m);
}

#[test, expected_failure(abort_code = EMatrixTypeMismatch)]
fun rejects_matrix_type_mismatch() {
    let mut ctx = tx_context::dummy();
    let mut edge = new_for_testing(A, B, &mut ctx);
    // EM 매트릭스를 넘기면서 CS로 기록 시도 → 차단.
    let em = trust_matrix::kind_em();
    let mut m = trust_matrix::new_for_testing(em, 0, &mut ctx);
    record(&mut edge, &mut m, A, B, trust_matrix::kind_cs(), 0, 1);
    destroy(edge);
    destroy(m);
}

#[test, expected_failure(abort_code = ESelfEdge)]
fun rejects_self_edge() {
    let mut scenario = ts::begin(A);
    create_edge(A, A, scenario.ctx());
    scenario.end();
}

#[test]
fun create_edge_shares_object() {
    let mut scenario = ts::begin(A);
    let id = create_edge(A, B, scenario.ctx());
    scenario.next_tx(A);
    let edge = scenario.take_shared<EdgeBalance>();
    assert_eq!(object::id(&edge), id);
    let (p0, p1) = participants(&edge);
    assert_eq!(p0, A);
    assert_eq!(p1, B);
    ts::return_shared(edge);
    scenario.end();
}
