# 온체인 신뢰 네트워크 행렬(TrustMatrix) 설계서

> 상태: 설계 확정(2026-06-21) · 구현 착수.
> 이 문서는 "신뢰 *집계*(fold + 전파)를 온체인으로 끌어올린다"는 결정의 단일 설계 원천이다.
> 기존 `_research/gathering-taxonomy-trust-balance/`(07 fold·09 propagation·PHI-5·CAT-1)와
> `apps/dibang-wedding/src/lib/credit.ts`(오프체인 시제품)의 수식을 **온체인으로 이관**한 것이다.

---

## 0. 결정 요약 (이 설계가 뒤집는 것 / 지키는 것)

| 항목 | 이전 | 이번 결정 |
|---|---|---|
| 분류(1층) | 온체인(`signal.move`) | **유지** |
| fold·전파·가중치(2·3층) | 오프체인(`credit.ts`) | **온체인으로 이관** ← 뒤집음 |
| 객체 종류 | — | **owned가 아니면 전부 shared object** |
| 최종 신용(가중합)·payment | — | **범위 밖**(아래 §6) — 매트릭스에 안 박음 |

**왜 뒤집나:** 분류만 온체인이면 DeFi는 "이게 부조다"까지만 trustless하게 안다. 신용 점수 자체를
trustless하게 쓰려면 fold·전파 결과(타입별 신뢰망)도 온체인이어야 한다. 가중치(정책·튜닝)만 소비자로 남긴다.

**왜 가능한가(성능 논외):** 사용자 결정 — 운영(병목·가스·병렬성)은 설계 범위 밖. 로직·수학적으로
모든 게 immutable 영수증(ActionRecord+Signal)에서 재생되는 결정적 사영이라 정합성이 구조적으로 보장된다.

---

## 1. 3층 구조

```
[1층] 영수증 (기존, 그대로)
   ActionRecord(soulbound) + Signal(분류 완료, 온체인 SSOT)
   = immutable · recompute-able 원천. 모든 상위 층은 이걸로 재생 가능한 "캐시".
        │  액션마다 signal 발생 (kind=EM부조/CS, source=원천행위, from→to, magnitude)
        ▼
[2층] EdgeBalance(A,B) (신규 · shared) — 쌍-국소(pair-local)
   두 사람 사이 타입별 방향 누적. 첫 상호작용 때 lazy 생성.
   give[type][A→B], give[type][B→A]  (EM)   ·   tie[A→B], tie[B→A] (CS)
        │  같은 tx에서 (엣지 fold 후 그 delta를)
        ▼
[3층] TrustMatrix[type] (신규 · shared) — 그래프-전역(global). 타입마다 하나.
   nodes(레지스트리) + adjacency(give, N×N) + π(전파결과). 자기완결적.
   "4명이면 4×4, 5명이면 5×5"의 그 행렬 = adjacency.
```

### 데이터-국소성 (왜 이렇게 쪼개나)

| 층 | 연산 | 필요 데이터 범위 |
|---|---|---|
| 1층 | 분류 | — (액션 자체) |
| 2층 fold | give/tie 누적 + net | **쌍만** |
| 2.5 정규화 | `w = give/recv` | **노드 이웃만** |
| 3층 전파 | 부동점 π | **그래프 전체** — 단 매트릭스 *내부에* 이미 있음 |

전파는 전이성 때문에 그래프 전체가 필요하지만, 그 전체는 **TrustMatrix가 자기 안에 보유**한다.
그래서 증분 갱신 입력은 `(직전 TrustMatrix + 신호 1개)`뿐 — 전체 엣지를 다시 읽지 않는다.

---

## 2. 타입 분할 규칙 — "합성 안 되는 것만 쪼갠다"

합쳐질 수 있으면(같은 대수 + 합산 가능) 한 매트릭스, 불가능하면 분리. 분할 축 = fold 키
`(자원, 청산구조, default판정)`(07 §2-2):

| 축 | 합성? | 처리 |
|---|---|---|
| **청산구조** EM(미청산) vs CS(무청산) | ❌ 대수 다름 | 항상 분리 (전파 연산자도 다름) |
| **자원** 돈·노동·시간·정보·돌봄… | ❌ 환산 미정 | **자원마다** 분리 |
| **default판정** 부조(불가) vs 대여(가능) | ❌ 신용 의미 다름 | 분리 (대여→payment, §6) |
| **CS source** 초대·참석·매칭·방명록·선물 | ✅ 같은 대수·magnitude=1 | **안 쪼갬** — source는 분해 metadata로 보존 |

→ **매트릭스 집합(범위 내):**
```
EM-부조[자원] : money, labor, time, info, care, …   (default판정=불가, 자원별 1개)
CS           : 단일 매트릭스 (source는 metadata)
```
현재 신호 모델이 실제 발행하는 것은 **EM-부조-money + CS** 뿐. 따라서 그 2개로 시작하되
EM은 `자원 id(u8)` 파라미터로 일반화 — 새 자원 신호가 오면 그 타입 매트릭스를 lazy 생성.

---

## 3. 전파 규칙 (PHI-5/CAT-1 · `credit.ts` 이관)

타입별 **독립** 전파. 둘 다 `d = 0.85`, 열-확률 정규화, 음수(배신/default) 클리핑, dangling teleport.

- **EM(부조)** — net 상쇄(wash 방어) 후 **reversed-giving PageRank**(베푼 쪽 적립):
  ```
  net[g][h] = max(0, give[g][h] − give[h][g])
  recv[h]   = Σ_g net[g][h]
  π_g = (1−d)/N + d · Σ_h ( net[g][h] / recv[h] ) · π_h
  ```
- **CS(유대)** — **authority PageRank**(유대 받는 쪽 적립):
  ```
  out[a] = Σ_b tie[a][b]
  π_b = (1−d)/N + d · Σ_a ( tie[a][b] / out[a] ) · π_a
  ```

수렴 검증은 09 PHI-5.4(부조 27회·CS 61회, tol 1e-13)에서 끝남 → 온체인은 **고정 반복수**(결정성)로 근사.

---

## 4. 증분 갱신 흐름

```
액션 → signal 분류(기존) → kind/source로 타입 결정
   → EdgeBalance(A,B): 그 타입 칸 fold
   → TrustMatrix[그 타입]: adjacency에 delta 반영 → propagate() (직전 π warm-start)
```
- 한 신호는 **자기 타입 매트릭스 하나만** 건드린다.
- **사람 추가**(N→N+1) = 첫 엣지 생길 때 매트릭스에 노드 등록 + 행·열 1개. teleport `(1−d)/N`은 N만 알면 전원 재계산(외부 데이터 0).
- **전제:** TrustMatrix가 결과 π뿐 아니라 **adjacency(행렬)를 보관** — 안 그러면 전체 재구축 필요.

---

## 5. Move 구현 메모 (정확성 · 성능 아님)

- **고정소수**: 부동소수 없음 → 정수 스케일 `SCALE = 1e9`. `fp_mul(a,b)=a·b/SCALE`, `fp_div(a,b)=a·SCALE/b` (u128 중간, 오버플로 회피). `D=0.85·SCALE`, `(1−d)=0.15·SCALE`.
- **결정성**: 수렴 tol 대신 **고정 반복수**(ITERS=60, `credit.ts`와 동일).
- **반복 가능 컬렉션**: `Table`은 키 열거 불가 → 전파가 전 노드를 훑어야 하므로 `VecMap` + `nodes: vector<address>` 사용.
- **net 상쇄·음수 클리핑**을 온체인 정규화에 포함.
- **π 저장값** = raw 부동점(순수 전파 결과). 0~1 정규화/excess는 표시·소비자 단계(매트릭스에 정책 안 박음).

---

## 6. 📌 범위 밖 — 기록만 (여기서 구현하지 않음)

> **payment 데이터 / 최종 신용 레이어는 이 설계에서 제외.**
> - **payment 데이터**: 형태 미정 — Sui payment kit receipt, 금융/DeFi 데이터, 토큰 등 여러 형태 가능.
>   (대여 상환=이행(perf)도 여기.)
> - **최종 신용** `= f({TrustMatrix[type]}, payment 데이터)` — 정책 가중치(예: 0.5·부조+0.3·CS+0.2·이행)로
>   **소비자(DeFi/앱)가 나중에 따로** 계산. 매트릭스에 가중치를 박지 않는다(정책 불변성).
> - 이 컨트랙트 책임은 **타입별 전파된 신뢰 행렬까지.**

---

## 7. 신규/변경 파일

| 파일 | 역할 |
|---|---|
| `sources/fixed_point.move` | 1e9 스케일 고정소수 산술 (신규) |
| `sources/trust_matrix.move` | 타입별 TrustMatrix shared object + 전파 엔진 (신규) |
| `sources/edge_balance.move` | per-pair EdgeBalance shared object + 매트릭스 연동 (신규) |
| (후속) 도메인 모듈 wiring | `cash_gift::give` 등에서 signal→matrix 라우팅 (별도 태스크) |

기존 `signal.move`/`ledger.move`/`event.move`(1층)는 변경하지 않는다.
오프체인 `credit.ts`는 온체인 결과의 **검증용 거울/폴백**으로 존치(최종 가중합은 소비자 정책으로 잔류).
