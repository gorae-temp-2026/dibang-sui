# 03 — 정체성·인증 (현재 Supabase + 목표 zkLogin)

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> 원본: `_architecture/API_CONVENTIONS.md`(§2 정책, §3 마스킹, §7 보안), `_scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md`, `VISION-AND-INTENT.md`(§3·§4·§5).
> "언제 로그인이 필요하고 언제 익명인가"를 정확히 잡는 문서. 온체인 신원 설계의 기반.

---

## A. 현재(오프체인) 인증 모델

### 인증 메커니즘
- **Supabase Auth JWT(Bearer 토큰).** Go handler가 JWT의 `sub` 클레임으로 user_id 추출.
- AuthMiddleware는 **soft**: 토큰이 없으면 막지 않고 통과시킨다(공개 엔드포인트용). 인증이 필요한 핸들러가
  `UserIDFromContext`로 직접 확인.

### 4가지 접근 정책 (모든 엔드포인트가 하나를 가짐)
| 정책 | 인증 | 인가 | 의미 / 예 |
|------|------|------|-----------|
| `public` | 불필요 | 없음 | 누구나. 청첩장·방명록 작성·축의·getWedding·host-invite 토큰 조회 |
| `authenticated` | 필수 | 없음 | 로그인하면 누구나. 라운지 입장·피드·하트·댓글·이음·메모리 |
| `owner` | 필수 | 본인 | JWT user_id == 리소스 소유자. `/users/me/*`, `/mois/me/*` |
| `host` | 필수 | Host | JWT user_id가 그 Wedding의 host 슬롯에 있는지. 결혼식 관리·장부·메모리북·공지 |

OpenAPI: `public` → `security: []`, 나머지 → 글로벌 `BearerAuth`. owner/host 인가 로직은 Go handler.

### 익명 경계 (로그인 없이 가능 = guest-web 퍼널)
`getInvitation`, `heartInvitation`, `getWedding`, `createGuestbookEntry`, `createGuestbookMessage`,
`createCashGift`, `getHostInvite`. → **방명록 `guest_id`는 optional**(비로그인 작성 가능).

### 로그인 게이트 (퍼널 → 본체 전환점)
- **`createLoungeCheckIn`(라운지 입장, authenticated)** 이 결정적 전환점. "라운지 입장은 로그인 필수"
  (도메인 모델 LoungeCheckIn 불변식). LoungeCheckIn은 user×lounge **1건**(DB UNIQUE, 재입장해도 안 늘어남).
- 사진 업로드(presigned)도 authenticated.

### 온보딩/동의 (첫 로그인)
- 첫 로그인 시 `/onboarding/consent` 인터셉트. 필수 3종(age_verification, service, privacy) + 선택 1종(marketing).
- `GET /me` 응답의 `consents_required: string[]`로 판정(빈 배열이면 통과). 비면 인터셉트.
- 3테이블: `profiles`(게이트 캐시·terms_version), `terms_documents`(메타데이터), `consent_records`(append-only 감사).
- 게이트 로직: `profiles.terms_version < MAX(terms_documents.version WHERE is_required)`.
- **구현됨(dev)**. 단 IP/UA 캡처는 현재 stub(`nil,nil`) → NULL.

### 익명 → 로그인 바인딩 (claim)
- **`claimGuestbookEntry`** (`POST /guestbook/{entryId}/claim`, authenticated): 비로그인으로 남긴 방명록
  Entry를 현재 로그인 유저에 **연결**. (계약엔 존재, 시나리오 문서엔 없음.)
- **축의금엔 claim이 없다.** 익명 축의는 익명으로 남고, 호스트가 장부에서 수동 추가/수정만 가능.

### 이름 마스킹 (프라이버시 계층)
- 모든 응답에서 타인 이름은 **기본 마스킹**("김민태"→"김*태"). DB엔 실명, 서버가 응답 시 분기.
- **해제 조건(OR)**: (1) 요청자가 그 Wedding의 Host, 또는 (2) 요청자↔대상 간 **Ium 관계 존재**(v3_iums 양방향).
- 비로그인은 항상 마스킹. 적용: `listGuestbookEntries`(guest_name), `listLoungeCheckIns`(visitor_name),
  `getMoi`(소유자명), `getUser`(name). 제외: WeddingInfo 이름(청첩장 public), 공지 작성자 Host명.

---

## B. 목표(온체인) 정체성 모델 — VISION §3·§4·§5

> 아래는 프로젝트 오너가 확정한 방향이다. 현재(A)에서 여기로 간다.

1. **zkLogin이 Supabase 로그인을 대체.** 단 **user 행(최소 Sui address)은 DB에 유지.** (VISION §3)
   - 즉 인증은 zkLogin으로 하되, off-chain DB엔 최소한 지갑 주소를 기록한다.
2. **지갑 1개 = User 1개 (영속).** User:Moi 1:1 → 지갑/Moi가 온체인 신원의 단위. (VISION §4)
3. **온체인은 익명이지만 활동 기록은 그 지갑에 귀속.** 활동 로그(이벤트/액션)는 **Soul Bound Token(SBT)**
   으로 **transfer 불가**여야 한다 → 익명이라도 활동 기록 기반 신용평가가 성립하고, 그 지갑을 계속 써야 함.
   (Move: `key`만, `store` 없음. 상세 `06-SUI-ONCHAIN-DIRECTION.md`)
4. **익명 하객 데이터**: 진짜 익명(지갑 로그인 안 함)도 혼주에게 중요하므로 남긴다. **claim 우선**(라운지
   로그인 후 본인 지갑 귀속), 어려우면 **서비스 대리서명** 임시 fallback. (VISION §5)
5. **공개 체인 ↔ 마스킹/프라이버시 충돌 주의**: 온체인 데이터는 공개다. 이름 등 민감 정보는 온체인에 평문
   저장 금지(민감하지 않은 상호작용만 온체인 — VISION §7). 마스킹이 필요한 식별정보는 off-chain 또는
   암호화/접근제어 계층이 필요하다. 신뢰 잔액 계산은 "민감하지 않은" 상호작용 신호로 한다.

---

## 현재 → 목표 정리

| 항목 | 현재(오프체인) | 목표(온체인) |
|------|----------------|--------------|
| 인증 | Supabase Auth JWT | **zkLogin** (대체), DB엔 address 유지 |
| 신원 단위 | User(이메일) | **지갑 = User = Moi (1:1)** |
| 익명 하객 | guest_id null + claim | claim 우선 / 서비스 대리서명 fallback |
| 활동 기록 | DB 행 | **SBT(transfer 불가)** |
| 이름 노출 | 서버 마스킹(Host/Ium 해제) | 민감정보 비온체인 + 접근제어 |
