# 디방 SUI 해커톤 — 문서 인덱스 (docs/hackathon)

> 해커톤 프론트 통합 + Moi Credit 데모의 핵심 문서·데이터 모음. (박태원 리뷰용 컨텍스트 진입점)

## 1. 설계 · 시나리오
- **핸드오프_React통합_260620.md** — 통합 스펙(§1~14): 4탭 네비 · 디방인연 · 라운지 레일 · 모이가모인곳 **광장** · 공유 프로필 · Moi Credit · **선물 거래 플로우(§13-5)** · 라이브러리(§7-1, 해커톤 예외).
- **데모_시나리오_260620.md** — 데모 시나리오: **철수 1인칭** · 철수♥영희 **'예정된 결혼식'** · "내 결혼식에 누가 올까" 하객 예측 → **DeFi 웨딩대출(Navi 랜딩 + DeepBook 유동성) 티저**. 데이터=fixture(철수=비실유저, user-scoped 쿼리라 anon 불가).
- **미니룸_에셋스펙_AI프롬프트_260620.md** — 손그림 에셋 소싱·카탈로그·AI 프롬프트.
- **ClaudeCode_첫프롬프트_260620.md** — Claude Code 초기 작업 지시.

## 2. Moi Credit 산출 논리 · 시뮬 (※ 코드와 함께 `_research/`에 위치 — 이미 레포에 있음)
- `../../_research/gathering-taxonomy-trust-balance/MOICREDIT_AUDIT.md` — **철수 정합성·튜닝 상수·정당화 원리 + 차별성 검증**(행동 기반, 철수 맞춤 아님).
- `../../_research/gathering-taxonomy-trust-balance/sim-scale.mjs` — **현실 규모 시뮬(300명)** — 1층 raw·철수 트레이스·층별 공식 산출 본체.
- `../../_research/gathering-taxonomy-trust-balance/sim.mjs` — 검증용(10명).
- `../../_research/gathering-taxonomy-trust-balance/07-fold-dynamics.md` — 2층 fold 이론.
- `../../_research/gathering-taxonomy-trust-balance/09-credit-propagation.md` — 3·4층 신용 전파(EigenTrust / reversed-giving PageRank).

## 3. 데이터 (산출 결과)
- **data/raw-events.csv** — 1층 raw 이벤트 로그 **6,916건** (sim-scale 산출: 이음·부조·대화·선물·방명록 등).
- **data/raw-events.xlsx** — 위 + 요약 시트(액션별·철수 신호 집계) + 철수 시트. (엑셀, 한글 안 깨짐)
- **data/chulsoo-profile.json** — 철수 공유 프로필 입력(노드 23·링크 22).
- *(raw 재생성: `_research/.../sim-scale.mjs` 실행 → `out/`)*

## 4. 손그림 에셋
- 실제 에셋(PNG) = `apps/dibang-wedding/public/assets/moi/` (머리 7·바디 6·아이템 17·액세서리 9).
- 매니페스트 = `apps/dibang-wedding/src/components/moi-gather/manifest.json`.
- **assets/catalog.png · catalog.md** — 라벨 + 요네 가격 카탈로그.

## 5. 핵심 수치 (현재)
- 철수 Moi Credit = **834/1000 · 티어 AAA · 300명 중 8위(상위 3%)**.
- 차별성 검증: default(미상환) 차주 평균 299위 vs 상환 차주 평균 22위 → 행동 반영 확인.
