/// TrustMatrix — 카테고리(타입)별 신뢰 네트워크 행렬을 *온체인*에서 보관·전파하는 공유 오브젝트.
///
/// ──────────────────────────────────────────────────────────────────────────────
/// 이 모듈이 하는 일 (설계서 `_architecture/ONCHAIN_TRUST_MATRIX_DESIGN.md`)
/// ──────────────────────────────────────────────────────────────────────────────
/// 기존엔 분류(1층, signal.move)만 온체인이고 fold·전파(2·3층)는 오프체인(credit.ts)이었다.
/// 이 모듈은 **3층(전파)을 온체인으로 끌어올린다.** 한 TrustMatrix = 한 "타입"의 신뢰망 전부:
///   - nodes      : 이 타입에 등장한 지갑 주소들(행렬의 행/열 인덱스). "4명이면 4×4, 5명이면 5×5"의 N.
///   - give       : 방향 가중 인접행렬 give[from][to] = 이 타입에서 from→to 누적값(부조 금액 또는 유대 횟수).
///   - pi         : 전파 결과(노드별 신용 기여, 고정소수). give를 전파 연산자로 돌린 부동점.
///
/// **왜 타입마다 따로인가:** 합성(합산/전파)이 안 되는 건 쪼갠다(설계 §2). EM(부조)·CS(유대)는 대수가
/// 다르고(전파 연산자도 다름), EM 자원(돈·노동·시간…)은 환산이 미정이라 못 더한다 → 자원마다 매트릭스.
/// CS의 source(초대·참석·매칭…)는 같은 대수라 한 매트릭스로 합치고 source는 1층 metadata로만 남긴다.
///
/// **자기완결성(핵심):** 전파(부동점 π)는 전이성 때문에 그래프 전체가 필요하다. 그 전체를 이 객체가
/// *자기 안에* give로 들고 있으므로, 갱신 입력은 (이 매트릭스 + 새 신호 1개)뿐 — 흩어진 엣지를 다시
/// 안 읽는다. 사람이 늘면(N→N+1) nodes에 한 줄 추가 + 전원 재전파(teleport (1−d)/N이 N만 알면 바뀜).
///
/// **재계산 가능성(정합성):** give·pi는 1층 영수증(ActionRecord+Signal)에서 결정적으로 재생되는 캐시다.
/// 따라서 "권위 원본"이 아니라 언제 처음부터 다시 풀어도 같은 값 → 드리프트가 구조적으로 불가능.
///
/// **범위 밖(설계 §6):** 최종 신용(타입별 π들 + payment 데이터의 가중합)·payment(상환·토큰·DeFi)는
/// 여기서 구현하지 않는다. 가중치는 정책이라 매트릭스에 박지 않는다 — 소비자(DeFi/앱)가 나중에 합산.
///
/// **전파 연산자(09 PHI-5 / credit.ts 이관):** 둘 다 d=0.85, 열-확률 정규화, dangling은 0 기여(teleport).
///   - EM(부조) = reversed-giving PageRank: net 상쇄(wash 방어) 후 *베푼 쪽*이 적립.
///       net[g][h]=max(0, give[g][h]−give[h][g]); recv[h]=Σ_g net[g][h];
///       π_g = (1−d)/N + d·Σ_h (net[g][h]/recv[h])·π_h
///   - CS(유대) = authority PageRank: *유대 받는 쪽*이 적립.
///       out[a]=Σ_b tie[a][b];
///       π_b = (1−d)/N + d·Σ_a (tie[a][b]/out[a])·π_a
///
/// 주의: 부동소수가 없어 모든 소수는 fixed_point(1e9 스케일) 정수로 계산한다(노드 간 결정성).
///
/// **성능 노트(설계 범위 밖이나 테스트는 실행돼야 함):** 비싼 VecMap(주소 키, O(n)) 작업은 propagate당
/// *한 번*만(인덱스 맵·정규화 분모·엣지 리스트 구축) 하고, ITERS회 반복 루프는 **인덱스 vector 순수 산술**
/// (O(1) 접근)로 돌린다. 가중치 d·w는 엣지마다 반복 불변이라 사전 계산해 둔다.
module dibang_wedding::trust_matrix;

use sui::event;
use sui::vec_map::{Self, VecMap};
use dibang_wedding::fixed_point as fp;
use dibang_wedding::signal::{Self, Signal};

// === Constants: kind (signal.move 미러 — append-only) ===
/// EM(부조) — reversed-giving 전파. signal::kind_busu()와 일치.
const KIND_EM: u8 = 1;
/// CS(유대) — authority 전파. signal::kind_cs()와 일치.
const KIND_CS: u8 = 2;

/// 전파 반복 횟수. 결정성을 위해 수렴 tol 대신 고정 반복(credit.ts ITERS와 동일).
/// 09 PHI-5.4에서 부조 27회·CS 61회 수렴 확인 → 60이면 본 도메인 규모에서 충분.
const ITERS: u64 = 60;

// === Errors ===
/// kind가 EM/CS가 아님.
const EInvalidKind: u64 = 0;
/// magnitude가 0 (신호 없음).
const EZeroMagnitude: u64 = 1;

// === Structs ===

/// 한 타입의 신뢰 네트워크 행렬. 공유 오브젝트(owned 아님 → 설계 결정대로 shared).
public struct TrustMatrix has key {
    id: UID,
    /// EM/CS — 전파 연산자를 가른다.
    kind: u8,
    /// EM 자원 구분(돈=0, 노동=1 …). CS는 0. 타입 식별 보조.
    resource_id: u8,
    /// 등장 노드(행렬 인덱스). 전파가 전 노드를 훑어야 해서 열거 가능한 vector로 둔다(Table는 열거 불가).
    nodes: vector<address>,
    /// 방향 가중 인접행렬 give[from][to]. EM=금액 누적, CS=횟수 누적.
    give: VecMap<address, VecMap<address, u64>>,
    /// 전파 결과 π(노드→고정소수). raw 부동점값(0~1 정규화·excess는 표시/소비자 단계).
    pi: VecMap<address, u64>,
}

// === Events ===

public struct TrustMatrixCreated has copy, drop {
    matrix_id: ID,
    kind: u8,
    resource_id: u8,
}

/// 한 신호가 반영돼 재전파됐음(인덱서/디버그용). n = 반영 후 노드 수.
public struct MatrixUpdated has copy, drop {
    matrix_id: ID,
    from: address,
    to: address,
    n: u64,
}

// === Constructors ===

/// 새 타입 매트릭스를 만들어 공유한다. 매트릭스 ID 반환.
public fun new_matrix(kind: u8, resource_id: u8, ctx: &mut TxContext): ID {
    let m = make(kind, resource_id, ctx);
    let id = object::id(&m);
    event::emit(TrustMatrixCreated { matrix_id: id, kind, resource_id });
    transfer::share_object(m);
    id
}

/// 빈 매트릭스 생성(공유 전). new_matrix·테스트 공용 — kind 검증 1곳에 모음.
fun make(kind: u8, resource_id: u8, ctx: &mut TxContext): TrustMatrix {
    assert!(kind == KIND_EM || kind == KIND_CS, EInvalidKind);
    TrustMatrix {
        id: object::new(ctx),
        kind,
        resource_id,
        nodes: vector[],
        give: vec_map::empty(),
        pi: vec_map::empty(),
    }
}

// === 증분 갱신 ===

/// 신호 한 개를 반영한다: from→to 엣지에 magnitude를 누적하고 **전 노드를 재전파**한다.
/// 입력은 (이 매트릭스 + 신호)뿐 — 외부 전체 데이터 불필요(give를 자기 안에 들고 있으므로).
/// 새 주소면 자동 등록(행렬 차원 +1). 같은 tx에서 EdgeBalance를 갱신하는 쪽이 이걸 호출한다.
public fun apply_signal(m: &mut TrustMatrix, from: address, to: address, magnitude: u64) {
    assert!(magnitude > 0, EZeroMagnitude);
    register_node(m, from);
    register_node(m, to);
    add_give(&mut m.give, from, to, magnitude);
    propagate(m);
    event::emit(MatrixUpdated { matrix_id: object::id(m), from, to, n: m.nodes.length() });
}

/// 분류된 신호 벡터 중 *이 매트릭스 타입에 해당하는* 신호를 한꺼번에 누적한 뒤 propagate를 **1회만** 호출.
/// 매칭(CS 양방향 2개) 등 fan-out > 1일 때 propagate 중복 호출을 피해 가스를 절감한다.
public fun apply_classified(m: &mut TrustMatrix, signals: &vector<Signal>) {
    let n = signals.length();
    let mut applied = false;
    let mut i = 0;
    while (i < n) {
        let s = signals.borrow(i);
        if (signal::kind(s) == m.kind && signal::resource_id(s) == m.resource_id) {
            let mag = signal::magnitude(s);
            assert!(mag > 0, EZeroMagnitude);
            register_node(m, signal::from(s));
            register_node(m, signal::to(s));
            add_give(&mut m.give, signal::from(s), signal::to(s), mag);
            event::emit(MatrixUpdated { matrix_id: object::id(m), from: signal::from(s), to: signal::to(s), n: m.nodes.length() });
            applied = true;
        };
        i = i + 1;
    };
    if (applied) {
        propagate(m);
    };
}

/// 아직 없는 주소면 노드 레지스트리에 추가(행렬에 행·열 1개 등장). 이미 있으면 무시.
fun register_node(m: &mut TrustMatrix, addr: address) {
    if (!m.nodes.contains(&addr)) {
        m.nodes.push_back(addr);
    };
}

/// give[from][to] += amount (없으면 칸 생성). 인접행렬에 delta를 더하는 유일 지점.
fun add_give(give: &mut VecMap<address, VecMap<address, u64>>, from: address, to: address, amount: u64) {
    if (!give.contains(&from)) {
        give.insert(from, vec_map::empty());
    };
    let row = give.get_mut(&from);
    if (!row.contains(&to)) {
        row.insert(to, 0);
    };
    let cell = row.get_mut(&to);
    *cell = *cell + amount;
}

// === 전파(Φ) — 부동점 π 재계산 ===

/// give 인접행렬 위로 전파 연산자를 ITERS회 반복해 π를 다시 푼다(cold start = 전 노드 base).
///
/// 절차:
///  (1) 주소→인덱스 맵, (2) 정규화 분모(EM=recv / CS=out)를 인덱스 vector로, (3) 엣지 리스트
///  {target_idx, source_idx, dw=d·w}를 구축 — 여기까지 VecMap을 쓰지만 propagate당 1회뿐.
///  (4) ITERS회 반복: next[target] += dw·pi[source] — 전부 인덱스 vector 산술(O(1)).
/// EM/CS 차이는 (2)(3)에 흡수: EM은 net 상쇄 후 recv 정규화·베푼 쪽(from) 적립, CS는 out 정규화·받는 쪽(to) 적립.
/// 통일식: next[target] += d·w·pi[source].  EM→(target=from, source=to) / CS→(target=to, source=from).
fun propagate(m: &mut TrustMatrix) {
    let n = m.nodes.length();
    if (n == 0) return;
    let kind = m.kind;
    let d = fp::damping();
    // teleport 기본선 (1−d)/N — 모든 노드에 깔린다. N이 바뀌면 전원 값이 이동(사람 추가의 정상 동작).
    let base = fp::one_minus_damping() / n;

    // (1) 주소 → 인덱스(노드 vector 위치).
    let mut idx = vec_map::empty<address, u64>();
    let mut k = 0;
    while (k < n) {
        idx.insert(*m.nodes.borrow(k), k);
        k = k + 1;
    };

    // (2) 정규화 분모(인덱스 vector): EM=recv[to]=Σ net[*][to], CS=out[from]=Σ tie[from][*].
    let denom = build_denom(&m.give, &idx, n, kind);

    // (3) 엣지 리스트: target/source 인덱스 + dw(=d·전이가중치, 반복 불변이라 사전 계산).
    let mut e_target = vector<u64>[];
    let mut e_source = vector<u64>[];
    let mut e_dw = vector<u64>[];
    let nf = m.give.length();
    let mut i = 0;
    while (i < nf) {
        let (from_ref, row) = m.give.get_entry_by_idx(i);
        let from = *from_ref;
        let fi = *idx.get(&from);
        let nr = row.length();
        let mut j = 0;
        while (j < nr) {
            let (to_ref, amt_ref) = row.get_entry_by_idx(j);
            let to = *to_ref;
            let amt = *amt_ref;
            let ti = *idx.get(&to);
            if (kind == KIND_EM) {
                // net 상쇄(wash 방어): net[from][to] = max(0, give[from][to] − give[to][from]).
                let reverse = get_give(&m.give, to, from);
                if (amt > reverse) {
                    let net = amt - reverse;
                    let recv_to = *denom.borrow(ti);               // recv[to] (>0)
                    let w = fp::fp_div_or_zero(net, recv_to);      // 전이가중치 net/recv
                    e_target.push_back(fi);                        // 베푼 쪽(from) 적립
                    e_source.push_back(ti);                        // 받은 쪽(to)의 π를 물려받음
                    e_dw.push_back(fp::fp_mul(d, w));
                };
            } else {
                let out_from = *denom.borrow(fi);                  // out[from] (>0)
                let w = fp::fp_div_or_zero(amt, out_from);        // 전이가중치 tie/out
                e_target.push_back(ti);                            // 유대 받는 쪽(to) 적립
                e_source.push_back(fi);                            // 보낸 쪽(from)의 π를 물려받음
                e_dw.push_back(fp::fp_mul(d, w));
            };
            j = j + 1;
        };
        i = i + 1;
    };

    // (4) 반복: π_target = base + Σ_edges dw·π_source. 순수 인덱스 vector 산술.
    let ne = e_target.length();
    let mut pi = vec_repeat(base, n);
    let mut it = 0;
    while (it < ITERS) {
        let mut next = vec_repeat(base, n);
        let mut e = 0;
        while (e < ne) {
            let tgt = *e_target.borrow(e);
            let src = *e_source.borrow(e);
            let dw = *e_dw.borrow(e);
            let cur = *next.borrow(tgt);
            *next.borrow_mut(tgt) = cur + fp::fp_mul(dw, *pi.borrow(src));
            e = e + 1;
        };
        pi = next;
        it = it + 1;
    };

    // π(인덱스 vector) → m.pi(주소 키 VecMap)로 기록.
    let mut pim = vec_map::empty<address, u64>();
    let mut k2 = 0;
    while (k2 < n) {
        pim.insert(*m.nodes.borrow(k2), *pi.borrow(k2));
        k2 = k2 + 1;
    };
    m.pi = pim;
}

/// 정규화 분모를 인덱스 vector로 만든다: EM이면 recv[to]=Σ net[*][to], CS면 out[from]=Σ tie[from][*].
fun build_denom(
    give: &VecMap<address, VecMap<address, u64>>,
    idx: &VecMap<address, u64>,
    n: u64,
    kind: u8,
): vector<u64> {
    let mut denom = vec_repeat(0, n);
    let nf = give.length();
    let mut i = 0;
    while (i < nf) {
        let (from_ref, row) = give.get_entry_by_idx(i);
        let from = *from_ref;
        let fi = *idx.get(&from);
        let nr = row.length();
        let mut j = 0;
        while (j < nr) {
            let (to_ref, amt_ref) = row.get_entry_by_idx(j);
            let to = *to_ref;
            let amt = *amt_ref;
            if (kind == KIND_EM) {
                let reverse = get_give(give, to, from);
                if (amt > reverse) {
                    let ti = *idx.get(&to);
                    let cur = *denom.borrow(ti);
                    *denom.borrow_mut(ti) = cur + (amt - reverse); // recv[to] += net
                };
            } else {
                let cur = *denom.borrow(fi);
                *denom.borrow_mut(fi) = cur + amt;                 // out[from] += tie
            };
            j = j + 1;
        };
        i = i + 1;
    };
    denom
}

// === 작은 유틸 ===

/// value를 n개 채운 vector<u64> (π·next·denom 초기화용).
fun vec_repeat(value: u64, n: u64): vector<u64> {
    let mut v = vector<u64>[];
    let mut k = 0;
    while (k < n) {
        v.push_back(value);
        k = k + 1;
    };
    v
}

/// give[from][to] 읽기(없으면 0).
fun get_give(give: &VecMap<address, VecMap<address, u64>>, from: address, to: address): u64 {
    if (!give.contains(&from)) return 0;
    let row = give.get(&from);
    if (!row.contains(&to)) return 0;
    *row.get(&to)
}

/// map[key] 읽기(없으면 0).
fun map_get(map: &VecMap<address, u64>, key: address): u64 {
    if (map.contains(&key)) *map.get(&key) else 0
}

// === Views ===

public fun kind(m: &TrustMatrix): u8 { m.kind }
public fun resource_id(m: &TrustMatrix): u8 { m.resource_id }
/// 행렬 차원 N(등장 노드 수).
public fun node_count(m: &TrustMatrix): u64 { m.nodes.length() }
/// 노드의 전파 신용 π(고정소수, 없으면 0).
public fun pi_of(m: &TrustMatrix, addr: address): u64 { map_get(&m.pi, addr) }
/// 인접행렬 한 칸 give[from][to](없으면 0).
public fun give_of(m: &TrustMatrix, from: address, to: address): u64 { get_give(&m.give, from, to) }

public fun kind_em(): u8 { KIND_EM }
public fun kind_cs(): u8 { KIND_CS }

/// (kind, resource_id) → u16 타입 키. TrustRegistry·EdgeBalance가 공유하는 타입 식별자(단일 정의처).
/// EM-money = (1<<8)|0 = 256, CS = (2<<8)|0 = 512.
public fun type_key(kind: u8, resource_id: u8): u16 {
    ((kind as u16) << 8) | (resource_id as u16)
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
const C: address = @0xC;

#[test_only]
/// 공유 안 하고 TrustMatrix를 직접 반환(전파 단위 테스트용).
public fun new_for_testing(kind: u8, resource_id: u8, ctx: &mut TxContext): TrustMatrix {
    make(kind, resource_id, ctx)
}

#[test]
/// EM: A가 B에게 부조 → 베푼 쪽 A가 받는 쪽 B보다 신용이 높다(reversed-giving).
/// 손계산: base=(1−d)/2=0.075, π_B=base, π_A=base+d·base=0.075·1.85=0.13875.
fun em_giver_gets_more_credit() {
    let mut ctx = tx_context::dummy();
    let mut m = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m, A, B, 100);
    assert_eq!(pi_of(&m, A), 138_750_000); // 베푼 쪽
    assert_eq!(pi_of(&m, B), 75_000_000);  // 받은 쪽 = teleport 기본선
    assert_eq!(node_count(&m), 2);
    destroy(m);
}

#[test]
/// CS: A가 B에게 유대(예: 초대) → 받는 쪽 B가 authority 적립.
/// π_A=base, π_B=base+d·base=0.13875.
fun cs_receiver_gets_authority() {
    let mut ctx = tx_context::dummy();
    let mut m = new_for_testing(KIND_CS, 0, &mut ctx);
    apply_signal(&mut m, A, B, 1);
    assert_eq!(pi_of(&m, B), 138_750_000); // 받은 쪽
    assert_eq!(pi_of(&m, A), 75_000_000);
    destroy(m);
}

#[test]
/// 순서 무관(결합법칙) — 같은 신호를 다른 순서로 넣어도 같은 π. (07 모노이드 / 09 셔플 검증의 온체인판)
fun order_independent() {
    let mut ctx = tx_context::dummy();
    let mut m1 = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m1, A, B, 100);
    apply_signal(&mut m1, C, B, 50);
    let mut m2 = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m2, C, B, 50);
    apply_signal(&mut m2, A, B, 100);

    assert_eq!(pi_of(&m1, A), pi_of(&m2, A));
    assert_eq!(pi_of(&m1, B), pi_of(&m2, B));
    assert_eq!(pi_of(&m1, C), pi_of(&m2, C));
    destroy(m1);
    destroy(m2);
}

#[test]
/// 사람 추가: N이 2→3이 되면 차원이 커지고 teleport 기본선이 바뀌어 전원 재전파.
/// C→A, A→B 체인이면 신용은 사슬 끝(가장 많이 베푼) C > A > B.
fun adding_node_grows_and_repropagates() {
    let mut ctx = tx_context::dummy();
    let mut m = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m, A, B, 100); // N=2
    assert_eq!(node_count(&m), 2);
    apply_signal(&mut m, C, A, 100); // N=3 (C 등장)
    assert_eq!(node_count(&m), 3);
    // base=(1−d)/3=0.05; π_B=0.05, π_A=0.05+d·0.05=0.0925, π_C=0.05+d·π_A=0.128625
    assert_eq!(pi_of(&m, B), 50_000_000);
    assert_eq!(pi_of(&m, A), 92_500_000);
    assert_eq!(pi_of(&m, C), 128_625_000);
    destroy(m);
}

#[test]
/// EM net 상쇄: A→B 100, B→A 100 (맞부조) → net 0 → 둘 다 teleport 기본선만(wash 방어).
fun em_mutual_giving_nets_out() {
    let mut ctx = tx_context::dummy();
    let mut m = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m, A, B, 100);
    apply_signal(&mut m, B, A, 100);
    assert_eq!(pi_of(&m, A), 75_000_000);
    assert_eq!(pi_of(&m, B), 75_000_000);
    destroy(m);
}

#[test]
fun new_matrix_shares_object() {
    let mut scenario = ts::begin(A);
    let id = new_matrix(KIND_EM, 0, scenario.ctx());
    scenario.next_tx(A);
    let m = scenario.take_shared<TrustMatrix>();
    assert_eq!(object::id(&m), id);
    assert_eq!(kind(&m), KIND_EM);
    assert_eq!(node_count(&m), 0);
    ts::return_shared(m);
    scenario.end();
}

#[test, expected_failure(abort_code = EInvalidKind)]
fun rejects_bad_kind() {
    let mut ctx = tx_context::dummy();
    let m = new_for_testing(9, 0, &mut ctx); // 9 = EM/CS 아님
    destroy(m);
}

#[test, expected_failure(abort_code = EZeroMagnitude)]
fun rejects_zero_magnitude() {
    let mut ctx = tx_context::dummy();
    let mut m = new_for_testing(KIND_EM, 0, &mut ctx);
    apply_signal(&mut m, A, B, 0);
    destroy(m);
}

#[test]
/// apply_classified: 신호 벡터 중 매트릭스 타입에 맞는 것만 적용(CS는 EM 매트릭스서 skip).
fun apply_classified_filters_by_type() {
    let mut ctx = tx_context::dummy();
    let mut em = new_for_testing(KIND_EM, 0, &mut ctx);
    let mut sigs = vector<Signal>[];
    sigs.push_back(signal::new_signal(signal::kind_busu(), 0, 0, A, B, 100)); // EM-money → 적용
    sigs.push_back(signal::new_signal(signal::kind_cs(), 0, 6, A, B, 1));     // CS → EM 매트릭스서 skip
    apply_classified(&mut em, &sigs);
    // BUSU만 반영된 2노드 부조 결과(베푼 A↑).
    assert_eq!(pi_of(&em, A), 138_750_000);
    assert_eq!(pi_of(&em, B), 75_000_000);
    destroy(em);
}
