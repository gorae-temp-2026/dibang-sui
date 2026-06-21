# 🚀 Claude Code 첫 프롬프트 — 디방 React 통합 + Moi Credit (260620)

> 아래 블록을 통째로 복사해서 Claude Code 새 세션 첫 메시지로 붙여넣으세요.
> (디방 모노레포 `digital-guestbook-v3`를 연 상태에서)

---

디방 SUI 해커톤 — **앞단 React 통합 + Moi Credit 산출**을 이어서 한다. 먼저 컨텍스트부터 읽고 시작하자.

## 나 / 팀
주식회사 고래유니버스 (2인: 대표=사업·기획[유상], 개발자=박태원). Social Transaction Intelligence 핀테크 · SUI 글로벌 해커톤. 슬로건 "관계가 전부다". 첫 제품 = 디지털방명록(디방). **D-2.**

## 먼저 읽을 것 (순서대로 정독)
1. **핸드오프(단일 기준):** `핸드오프_React통합_260620.md` — §7 기술규칙·§8 브랜치·§12 UI 디테일·§13 프로필/Moi Credit/이음 정보공개까지 전부 들어있음.
2. **목업(설계도):** `디방_통합목업_260620.html` (+ `인연/디방인연_틴더식_목업_260617.html`, `디방웨딩v3/라운지디자인/모이가모인곳_v2.0.html`).
3. **레포 규칙:** 루트 `CLAUDE.md`, `_architecture/` 전체, `_code_convention/`, `_architecture/tech-stack-map.html`.
4. **Moi Credit 이론/시뮬:** `_research/gathering-taxonomy-trust-balance/`(`07-fold-dynamics.md`, `09-credit-propagation.md`, **`sim.mjs`**), `_research/2026_blockchain_hackathon/.../003_eigentrust-normalized-local-trust-clamp.md`, `해커톤/수이해커톤/해커톤_회의록_260619_모이크레딧_4층모델.md`.

## 작업 규칙 (필수)
- **dev에서 워크트리 분기:** `git fetch origin dev` → `git worktree add .claude/worktrees/<name> -b feat/<도메인> origin/dev`. **main 금지.**
- **Tailwind + shadcn/ui + React + TypeScript. 직접 구현 금지 — 검증된 라이브러리.** 충실 포팅·과도한 다듬기 금지·신규/위험부는 스텁+TODO.
- **codegraph 우선**(rg 직행 금지) · **xState**(2+ 비동기 분기) · env·마이그레이션 규칙 · 디자인 토큰 = `App.css`(lng-*)·`theme.ts` · **CLAUDE.md 함부로 수정·커밋 금지.**

## 할 일 (순서)
1. `MainLayout` 4탭(Inyeon · Event list · My event · Setting) + `App.tsx` Inyeon 라우트. (기존 디방웨딩 3화면은 그대로, 네비만 조정)
2. **Inyeon 탭** — 디방인연 목업 포팅(틴더식 세로 스와이프 · 요네 필터 · **사진 무료 2장 / 3장째 요네** · 이음→프로필→대화).
3. **라운지 레일 재구성**(공지 host · 메모리 · 피드 · 들러리선물 · **접기/펴기**) + 디스플레이 = **MEC Display**(guest-web `/display?weddingId=…`) 새 탭.
4. **모이가모인곳** — 먼저 **정적 스텁(장면 이미지 + TODO)** → 라이브러리 확정 후 **PixiJS 본구현**(2.5D 미니룸). **샵·들러리선물 = v2.0 포팅**(샵은 모이가모인곳 내부).
5. **공유 프로필 컴포넌트**(인연·모이가모인곳 공용): **① 인연 연결**(force-graph, 사진 노드) + **② 우리 signal**(2D sunburst = 2층 fold, EM·CS 실값/AR 표시/MP 스텁) + **익명 신뢰범위**. **★ Moi Credit 정확값은 프로필 밖 = 온체인 오브젝트.** 공개범위 ①②③(핸드오프 §13).
6. **Moi Credit 산출(데모 심장)** — `sim.mjs` 정독·확장(2층 fold → 3층 Φ = EigenTrust / reversed-giving PageRank) → **철수 페르소나의 Moi Credit 산출** → ④ 가상 소비자가 **정체 모른 채 read**하는 장면.
- (박태원·뒷단 병렬) SUI zkLogin/sponsored tx · 신뢰 attestation · **Moi Credit 온체인 오브젝트**.

## 합동 확정 필요 (솔로 금지)
- 미니룸/네트워크 **라이브러리**(PixiJS·react-konva / react-force-graph·d3-force) + **tech-stack-map 등재**.
- React 산출물을 **프로덕트 앱에 직접 통합**하는 범위.
- **Moi Credit 4층 통합 함자**(현재 가중합, 𝒲 트랙 미해결).

## 데모 스코프
**Moi Credit 산출까지.** 대출 등 실제 금융행위 미구현. Moi Credit = SUI 위 composable 온체인 신용 오브젝트(다른 프로토콜이 read-only로 활용).

## 첫 작업 지시
위 1~4 문서를 읽어 컨텍스트를 잡은 뒤, **현재 디방웨딩 앱 구조 대비 통합 작업 범위를 파일 단위로 codegraph로 정리**해서 먼저 보여줘. 그다음 **①(네비 4탭)부터** 시작한다.

---
