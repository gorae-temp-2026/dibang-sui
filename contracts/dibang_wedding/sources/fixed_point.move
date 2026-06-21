/// 고정소수(fixed-point) 산술 — 신뢰 전파(PageRank류)를 온체인에서 결정적으로 계산하기 위한 기반.
///
/// **왜 필요한가:** Move엔 부동소수(float)가 없다. 그런데 전파 연산자(09 PHI-5)는 정규화
/// `w = give/recv`(0~1 비율)와 감쇠 `d=0.85`, 확률 벡터 π(합 ≈ 1) 같은 *소수* 값을 다룬다.
/// 그래서 모든 소수를 **정수 × 고정 스케일(SCALE)** 로 표현한다. 예: 0.85 → 850_000_000.
/// 정수라서 노드마다 **완전히 같은 결과**가 나온다(부동소수의 비결정성·반올림 편차 없음) → 온체인 적합.
///
/// **스케일 선택(SCALE = 1e9):** π[i]는 보통 1/N 규모라 작다. 1e9 스케일이면 노드가 수천이어도
/// π[i] ~ 수백만(scaled)이라 정밀도가 충분하다. 곱·나눗셈 중간값은 u128로 받아 오버플로를 피한다
/// (1e9 × 1e9 = 1e18 < u128 한계 ~3.4e38).
///
/// 이 모듈은 *순수 산술*만 담는다. 그래프·전파 로직은 trust_matrix.move.
module dibang_wedding::fixed_point;

// === 상수 ===

/// 고정소수 스케일. 1.0 == SCALE. 모든 비율/확률은 이 배율로 표현한다.
const SCALE: u64 = 1_000_000_000;
/// 감쇠 계수 d = 0.85 (PageRank 표준). 전파에서 "한 다리 더 갈 확률".
const DAMPING: u64 = 850_000_000;
/// (1 − d) = 0.15. teleport(순간이동) 가중 — 모든 노드에 깔리는 기본선.
const ONE_MINUS_DAMPING: u64 = 150_000_000;

// === 상수 접근자 (다른 모듈/테스트가 씀) ===

/// 1.0에 해당하는 스케일 값.
public fun scale(): u64 { SCALE }
/// 감쇠 d (scaled).
public fun damping(): u64 { DAMPING }
/// (1 − d) (scaled).
public fun one_minus_damping(): u64 { ONE_MINUS_DAMPING }

// === 산술 ===

/// 고정소수 곱: (a × b) / SCALE. 두 scaled 값을 곱해 다시 scaled로 되돌린다.
/// 예: 0.5 × 0.5 = 0.25 → fp_mul(5e8, 5e8) = 25e7. u128 중간으로 오버플로 회피.
public fun fp_mul(a: u64, b: u64): u64 {
    (((a as u128) * (b as u128)) / (SCALE as u128)) as u64
}

/// 고정소수 나눗셈: (a × SCALE) / b. raw 비율을 scaled 값으로 만든다.
/// 예: give=3, recv=4 → w = 0.75 → fp_div(3, 4) = 75e7. b==0이면 호출 금지(아래 fp_div_or_zero 사용).
/// a는 raw(예: 부조 금액) 또는 scaled 둘 다 가능 — 의미는 호출부가 정한다(전파에선 give/recv = raw/raw → scaled).
public fun fp_div(a: u64, b: u64): u64 {
    (((a as u128) * (SCALE as u128)) / (b as u128)) as u64
}

/// 분모가 0이면 0을 돌려주는 안전 나눗셈. dangling 노드(recv/out = 0)에서 0 기여로 처리(09: dangling teleport).
public fun fp_div_or_zero(a: u64, b: u64): u64 {
    if (b == 0) 0 else fp_div(a, b)
}

// === Tests ===

#[test_only]
use std::unit_test::assert_eq;

#[test]
fun mul_half_times_half_is_quarter() {
    // 0.5 × 0.5 = 0.25
    assert_eq!(fp_mul(SCALE / 2, SCALE / 2), SCALE / 4);
}

#[test]
fun mul_by_one_is_identity() {
    // x × 1.0 = x
    assert_eq!(fp_mul(123_456_789, SCALE), 123_456_789);
}

#[test]
fun mul_damping_example() {
    // d × 0.075 = 0.06375 (전파 2노드 예제에서 나오는 값)
    assert_eq!(fp_mul(DAMPING, 75_000_000), 63_750_000);
}

#[test]
fun div_three_quarters() {
    // 3/4 = 0.75
    assert_eq!(fp_div(3, 4), 750_000_000);
}

#[test]
fun div_or_zero_guards_zero_denominator() {
    assert_eq!(fp_div_or_zero(5, 0), 0);
    assert_eq!(fp_div_or_zero(3, 4), 750_000_000);
}

#[test]
fun no_overflow_near_one() {
    // 1.0 근처 값끼리 곱해도 u128 중간으로 안전.
    let almost_one = SCALE - 1;
    assert_eq!(fp_mul(almost_one, almost_one), 999_999_998); // (SCALE-1)^2/SCALE
}
