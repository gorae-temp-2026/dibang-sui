# 결정 로그 (Decision Log) — dibang-sui

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> 대상: `_research_analysis/2026-06-21-conversation-intent-extraction`의 세션 의도 노트(`06-.../`)
> + 5차 가공 산출물(`05-.../`_appended/docs·code).
> 목적: 대화에서 내려진 **주요 결정과 그 근거·의도**를 사실 그대로 정리. 추측 없음, 입력 근거.
> 모순·번복이 있었던 건은 "최종 입장"과 "왜 바뀌었나"를 함께 적었다.
> 출처 표기: `docs/onboarding.md`·`docs/architecture.md`·`docs/research-and-claude.md`·`code/move-contracts.md`·`code/packages-sdk.md`·`code/api-go.md`·`docs/scenario.md`·`docs/code-convention.md`(전부 `05-process-pass5/_appended/` 하위), `session-intent-notes.md`(`06-process-pass6/_synthesis-inputs/`).

---

## A. 온체인 방향 (왜 Sui인가 · 무엇을 온체인에 올리나)

### 결정: 프로젝트의 정체는 "방명록을 블록체인에 올리기"가 아니라 "상호작용을 신용의 원료로 삼는 신뢰네트워크 DeFi"다
- **맥락**: 디방(Dibang)은 결혼식 디지털 방명록 + 웨딩 라운지 서비스. 이전 세션들이 "오프체인을 그대로 온체인에 올린다"로 오해함.
- **결정**: 결혼식 등 이벤트의 사람 간 상호작용 데이터를 Sui 온체인에 올리고 → 관계 신뢰 잔액 → 지갑 신용 평가 재료 → DeFi에 활용. 제출 트랙은 Sui Overflow 2026 Payment & DeFi.
- **근거·의도**: 결혼식 = 신뢰망을 일생 1회 전수 샘플링하는 진입점(통과의례×전체소집×부조×공식기록×일생1회의 유일 조합). "beyond traditional DeFi"(담보 중심 → 사회적 신뢰 기반)에 정렬. 심사 가중치 Real-World Application 50%가 최대 승부처.
- **영향**: 모든 하위 결정(SBT, raw 액션 원장, 신용 모델)의 상위 전제. 권장 1차 데모 = 로그인(zkLogin) → 온체인 상호작용(SBT) → 신뢰잔액/신용 점수 표시 → 그 점수로 DeFi 동작(대출 한도) 한 흐름.
- (출처: docs/onboarding.md §1·§12·§14, docs/research-and-claude.md A4)

### 결정: 신뢰네트워크(Moi·MoiItem·Ium·InteriorItem·MoiGatherPlace)는 "전환"이 아니라 온체인 그린필드 신규 구축
- **맥락**: 이 도메인들이 오프체인에 이미 있다고 가정한 이전 세션이 헛다리(L4).
- **결정**: 오프체인엔 미구현 상태(계약상 14개 operation `deprecated:true` + 백엔드 501 + 프론트 전무)이므로 "오프체인→온체인 전환"이 아니라 **처음부터 온체인으로 새로 짓는 그린필드**. 이번 해커톤의 핵심 구현 대상.
- **근거·의도**: 실제 코드 상태 확인 결과 — Go server의 Iums·Mois·MoiItems·GatherPlace·InteriorItems가 501 stub. `v3_iums`는 테이블만 있고 생성 경로(CRUD UX)는 501이라 이음은 사실상 미존재.
- **영향**: 이름 마스킹 해제가 `v3_iums`에 의존하지만 Ium 생성 경로가 없어 현재 해제 불가에 가까움. 신규 온체인 설계의 우선 대상.
- (출처: docs/onboarding.md §3·§7·§13(L4), docs/architecture.md §6, code/api-go.md §3)

### 결정: 온체인 = raw 액션의 불변 원장. 신뢰 해석(부조/거래/EM·CS·신용)은 저장하지 않고 규칙으로 계산
- **맥락**: 같은 "돈 건넴"이 (하객→혼주)면 부조(EM○), (혼주→업체)면 거래(EM✗·신용○)로 갈림.
- **결정**: 온체인엔 raw 액션(action_type·actor·target·event·resource·amount·timestamp)만 저장. 자원·청산·극성·공개 같은 해석값은 `project(action_type × event_type × role)`로 계산하고 저장 안 함. EM/CS fold·PageRank Φ(신용)는 오프체인(또는 별도 모듈).
- **근거·의도**: raw에 신뢰를 박으면 재해석이 막히고 규칙이 이중 적용된다(리서치 H11). 결정값(무방향·default 0.2·비중 0.5/0.3/0.2)은 임의·튜닝 대상이라 온체인에 박으면 안 됨. 같은 행위의 다중 해석/규칙 진화 가능성 확보.
- **영향**: 온체인 데이터 모델 v0.1(entity·event_type·event·participation·role_type·action·action_type) 7개 엔티티의 골격. 부정 액션(배신·모욕)도 독립 action_type, 극성은 project가 계산.
- (출처: docs/onboarding.md §9·§12, docs/research-and-claude.md A10(H11)·B3, CLAUDE.md §3)

### 결정: 민감정보(이름 등)는 온체인 평문 저장 금지. 신뢰 신호는 비민감 상호작용으로만
- **맥락**: 온체인 데이터는 공개. 한편 서비스엔 타인 이름 기본 마스킹 규칙이 있음(공개 체인 ↔ 프라이버시 충돌).
- **결정**: 이름 등 민감 정보는 온체인에 평문으로 올리지 않는다. 좋아요·하트·댓글·방문 등 민감하지 않은 상호작용만 온체인 신뢰 신호로. 마스킹 필요한 식별정보는 off-chain 또는 암호화/접근제어 계층.
- **근거·의도**: 신용평가에 필요한 건 "누가 누구와 어떤 상호작용을 했나"의 구조이지 실명 자체가 아님. 공개 체인 노출 위험 차단.
- **영향**: 사진 공유도 prod에선 public/private 버킷 분리 필요(공개 체인 노출 전 private 사진은 실제 접근제어).
- (출처: docs/onboarding.md §5(목표)·§18, docs/research-and-claude.md B3, CLAUDE.md §3)

### 결정(번복 있음): 돈/금융은 실제로 SUI 온체인으로 흐른다 (추후 USDSui)
- **맥락**: 축의금 등 금융 행위의 처리 방식. 중간에 "기록만 남긴다"로 정정했다가 다시 뒤집힘.
- **최종 입장**: 모든 송금·금융 행위는 실제 SUI로 온체인 이체된다. vault/온체인 결제 방향이 맞다. stable coin(USDSui) 전환은 서비스 로직 구현이 다 끝난 다음.
- **왜 바뀌었나**: 한때 축의금을 "단순 기록/오프체인 결제"로 가정했으나(양방향 오류 L5), VISION §6 원문이 "여기서 발생하는 모든 송금·금융 행위는 SUI를 통해 이뤄진다"이므로 "기록만"은 오류로 판정해 되돌림.
- **영향**: Move `cash_gift` 모듈이 실제 `Balance<SUI>` 금고(CashGiftVault)에 입금하고 호스트가 `WeddingCap`으로 인출하는 구조로 구현됨. 오프체인 도메인 모델은 여전히 "딥링크 송금 유도 후 기록"이라 적혀 있어 온체인 방향과 차이가 있음(온체인 = 실제 송금).
- (출처: docs/onboarding.md §13(L5)·§15, code/move-contracts.md §7, docs/architecture.md CashGift 항목)

### 결정: 결정 대기 항목이 확정되기 전엔 큰 온체인 구현 착수 금지 (5건 미해결)
- **맥락**: 온체인 작업에 선행 결정이 필요한 항목들이 미확정.
- **결정**: 다음 5건이 확정되기 전엔 큰 구현을 시작하지 않고 사용자에게 확인: ① 익명 기록 claim 방식(직접발행/참조-mint/off-chain→mint) ② 돈 온체인 형태(SUI→USDSui 전환 시점·범위) ③ WeddingCap soulbound 여부 ④ 신용 점수 계산 위치(인덱서/오프체인 vs 온체인 모듈) ⑤ mainnet 배포 시점(상금 100% 조건).
- **근거·의도**: 잘못된 전제 위에 빌드부터 하면 의도와 어긋남(L1). 결정값·아키텍처 선택은 가스·검증 트레이드오프가 커서 임의로 못 정함.
- **영향**: 상금 50%는 수상 발표 시·나머지 50%는 mainnet 성공 배포 후 → mainnet 배포를 목표에 포함해야 전액. 현재 testnet 배포만 됨.
- (출처: docs/onboarding.md §11·§14, CLAUDE.md §3)

---

## B. SBT (soulbound) vs store — 능력(ability) 기준 객체 설계

### 결정: 활동·관계 기록은 transfer 불가(SBT, `key`-only). 거래/선물 의도 자산만 `store`
- **맥락**: 이전 구현이 활동 기록 객체를 `key+store`(transfer 가능)로 만들어 둠(L3).
- **결정**: 신용평가 무결성을 위해 방명록·축의·관계 같은 활동/관계 기록은 다른 지갑으로 못 옮기게 `key`만 부여(=`store` 없음). 거래/선물 의도가 있는 자산만 `store` 허용.
- **근거·의도**: 활동 기록이 지갑 간 이전 가능하면 신용 이력을 사고팔 수 있어 신용평가가 무너짐. 익명이라도 그 지갑을 계속 써야 신용이 성립.
- **영향**: SBT 정정 대상 3개 확정 — `guestbook::GuestbookEntry`, `cash_gift::CashGiftRecord`, `ium::Ium`을 key-only로 정정. `moi::MoiItem`은 선물·거래 의도 자산이라 store 유지(단 신용 "기록" 입력에선 제외). `moi::Moi`는 이미 key-only(올바름)라 유지. `wedding::WeddingCap`은 key-only 검토(자유 이전이 host-invite 우회 가능). 단 현재 소스는 아직 GuestbookEntry·CashGiftRecord·Ium이 `key+store`로 남아 있어 정정 미반영 상태.
- (출처: docs/onboarding.md §3·§8·§10·§13(L3), code/move-contracts.md §8-1, CLAUDE.md §3)

### 결정: testnet 실호출 + 독립 적대적 리뷰는 온체인·보안 작업의 필수 검증 (빌드/유닛이 못 잡는 결함)
- **맥락**: 빌드·유닛 통과가 "맞다"를 보장하지 않음.
- **결정**: 온체인·보안 변경은 testnet 실호출 스모크 + 독립 적대적 리뷰(Opus)로 검증.
- **근거·의도(실증 사례)**: testnet 스모크가 `Moi` key-only를 PTB `transferObjects`로 못 옮기는 `InvalidTransferObject`를 잡아 설계 정정 유도. 독립 보안 감사가 sponsor의 가스 코인 탈취 + aud 검증 우회(fail-open) 두 CRITICAL을 잡음.
- **영향**: SDK가 모듈 내부 transfer(`create_moi`는 직접 transfer, 나머지는 반환 후 PTB transfer) 패턴으로 정착. sponsor 화이트리스트/fail-closed로 수정(아래 D 참조).
- (출처: docs/onboarding.md §13(검증 사례), code/move-contracts.md §8-2, CLAUDE.md §3)

---

## C. 인증·zkLogin·익명 처리

### 결정: zkLogin이 Supabase 로그인을 대체하되, 지갑 1개 = User 1개(영속), user 행은 DB 유지
- **맥락**: 현재 Supabase Auth JWT(Bearer)로 인증. 목표는 온체인 신원.
- **결정**: zkLogin이 Supabase 로그인을 대체. 단 최소 Sui address를 담은 user 행은 DB에 유지. 지갑/Moi가 온체인 신원의 단위(User:Moi 1:1, 영속).
- **근거·의도**: 온체인은 익명이지만 활동 기록이 그 지갑에 SBT로 귀속 → 익명이라도 활동 기반 신용평가가 성립하고 같은 지갑을 계속 써야 함.
- **영향**: salt 서버가 "같은 구글 계정 → 항상 같은 salt → 항상 같은 Sui 주소"를 보장(랜덤 저장 안 함). 결정성·핸들러 테스트 완료.
- (출처: docs/onboarding.md §5(목표)·§8, code/api-go.md §5-6, code/packages-sdk.md zklogin.ts)

### 결정: zkLogin salt 서버는 결정적 HMAC, audience 미설정 시 fail-closed
- **맥락**: 초기 구현에 검증 우회(fail-open) 결함이 있었음(독립 감사가 적발).
- **결정**: salt = HMAC-SHA256(masterSecret, len-prefixed(iss,aud,sub)) 앞 16바이트의 십진 문자열. GoogleJWTVerifier는 RS256 서명 + iss + aud(=GOOGLE_CLIENT_ID) + exp 검증. audience 미설정이면 거부(fail-closed). 검증 실패는 401(사유 비노출).
- **근거·의도**: aud 검증을 건너뛰면 임의 OAuth client의 토큰으로 우회 가능 → 반드시 닫아둠. 결정성으로 같은 계정에 같은 주소 보장.
- **영향**: `/zklogin/salt`는 `ZKLOGIN_MASTER_SECRET`+`GOOGLE_CLIENT_ID` 둘 다 있을 때만 활성. JWKS 메모리 캐시(TTL 1h), kid 로테이션 1회 재조회.
- (출처: code/api-go.md §2·§5-6)

### 결정(인프라 전환): ZK prover는 self-host 대신 hosted 사용 (arm64 미지원)
- **맥락**: zkLogin 라이브 검증에 ZK prover가 필요. prover self-host를 시도.
- **결정/전환**: prover self-host를 시도했으나 arm64 미지원으로 막혀 hosted prover로 전환.
- **근거·의도**: 로컬(arm64) 환경 제약으로 self-host 불가 → 운영 가능한 hosted 경로 선택.
- **영향**: zkLogin 라이브 검증은 Google OAuth client + ZK prover가 있어야 가능(헤드리스 불가) → 자격증명 없으면 "자격증명 대기"로 명시(거짓 완료 보고 금지).
- (출처: session-intent-notes.md [A/28ba2a9b#3], CLAUDE.md §5)

### 결정: 익명 하객 데이터는 남긴다. 1순위 claim 귀속, 임시 fallback은 서비스 대리서명 — claim 방식은 미확정
- **맥락**: Sui 지갑 로그인을 안 한 진짜 익명 하객의 데이터도 혼주에게 중요.
- **결정(원칙)**: 익명 데이터는 남긴다. 1순위는 라운지 로그인 후 claim으로 본인 지갑 귀속, 임시 fallback은 서비스가 대신 서명해 기록.
- **미해결 충돌**: SBT(soulbound)면 transfer 불가 → 익명(대리서명) 기록을 나중에 사용자 지갑으로 옮길 수 없음. 해소안 후보 (a) 로그인 후 작성은 처음부터 사용자 지갑으로 직접 발행 (b) 익명 기록은 레지스트리 항목으로 두고 claim 시 자기 SBT 새로 mint (c) 익명 기록 off-chain에 두고 claim 시 온체인 mint → **결정 대기(A의 결정 대기 항목 ①)**.
- **영향**: 오프체인엔 `claimGuestbookEntry`(authenticated)가 계약상 존재. 축의금엔 claim 없음 — 익명 축의는 익명으로 남고 호스트가 장부에서 수동 보정만.
- (출처: docs/onboarding.md §6·§11, docs/architecture.md API §9)

### 결정: Dev 인증 우회는 헤드리스 온체인 테스트 한정, prod 금지
- **맥락**: zkLogin/OAuth 없이 온체인 흐름을 헤드리스로 테스트할 필요.
- **결정**: `DEV_AUTH_BYPASS=true` + `X-Dev-Auth` 헤더면 Supabase 검증 없이 고정 `DEV_USER_ID` 주입. prod 사용 금지.
- **근거·의도**: 라이브 zkLogin 검증이 헤드리스 불가라 테스트 동선을 확보하되, 운영에선 절대 켜지 않도록 분리.
- (출처: code/api-go.md §1, session-intent-notes.md [A/28ba2a9b#5] C6X-1·2·3)

---

## D. Sponsor (가스 대납) 보안

### 결정: sponsor는 모든 PTB 커맨드를 화이트리스트 검사 (MoveCall만 검사하던 초기 구현은 치명적 결함)
- **맥락**: 가스 대납(sponsored tx)에서 초기엔 MoveCall만 검사했음.
- **결정**: `assertSponsorable(tx, allowedPackageId)`가 모든 커맨드를 검사 — MoveCall은 허용 패키지만(최소 1개 필수), SplitCoins/MergeCoins/TransferObjects/MakeMoveVec는 **가스 코인(`tx.gas`) 사용 시 거부**, Publish/Upgrade/$Intent/미지 커맨드 일괄 거부.
- **근거·의도**: MoveCall만 검사하면 `splitCoins(tx.gas, …)` + `transferObjects(…, attacker)`로 sponsor 가스 자체를 탈취 가능(독립 보안 감사가 잡은 CRITICAL). 가스 코인을 건드리는 모든 경로를 차단해야 안전.
- **영향**: sponsor 서버(Node)에서 서명 전 검증. 서명 전략은 콜백으로 받아 sponsor 로직을 zkLogin에 결합하지 않음(`sponsoredExecute`).
- (출처: code/packages-sdk.md sponsor.ts, docs/onboarding.md §8·§13)

---

## E. 앱 경계 (절대 혼동 금지)

### 결정: guest-web = 비로그인 익명 전환 퍼널 / dibang-wedding = 로그인 서비스 본체. zkLogin·온체인 신원은 dibang-wedding에만
- **맥락**: 이전 세션이 익명 퍼널(guest-web)에 zkLogin을 붙임(L2).
- **결정**: 경계 기준은 "전환 퍼널이냐 서비스 본체냐"(로그인 여부는 보조). guest-web은 공유 링크/QR 착지점의 비로그인 퍼널(퍼널 A 청첩장 / 퍼널 B 방명록·축의), 종착은 라운지 진입 유도. zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 전부 dibang-wedding 소속.
- **근거·의도**: guest-web에 로그인을 붙이면 전환 퍼널의 마찰이 커지고 앱 책임이 섞임. 온체인 신원은 식별된 본체 사용자에게만 의미.
- **영향**: guest-web 호출 엔드포인트는 전부 public(getInvitation/heartInvitation/getWedding/createGuestbookEntry/createGuestbookMessage/createCashGift). 로그인 게이트(퍼널→본체 전환점)는 dibang-wedding의 `createLoungeCheckIn`(authenticated).
- (출처: docs/onboarding.md §4·§13(L2), docs/architecture.md §7, CLAUDE.md §2)

### 결정(번복): 비로그인 축의(현금 송금) 플로우까지 guest-web이 책임진다 (2026-05-18 확정)
- **맥락**: 원래 축의(현금 송금) 경험이 dibang-wedding(로그인)에 있었음. "비로그인이면 최소 행위만"이라는 통념과 충돌.
- **최종 입장**: 축의 경험을 dibang-wedding → guest-web으로 옮긴다(2026-05-18 확정). 즉 돈(축의)도 비로그인 퍼널을 지난다.
- **왜 바뀌었나**: 전환 퍼널의 완결성(QR→방명록→축의→메시지→완료 한 흐름) 우선. "비로그인=최소 행위"가 아니라 전환 퍼널 전체를 guest-web이 책임지는 게 경계 원칙에 맞음.
- (출처: docs/onboarding.md §4, docs/architecture.md §7)

### 결정: admin은 별도 운영 앱. read-only 표기와 달리 실제로는 운영 mutation 포함(allowlist 가드)
- **맥락**: CLAUDE.md에는 "admin = 별도 운영 read-only"라 적혀 있으나 실제 계약엔 파괴적 작업 다수.
- **최종 입장**: admin은 별도 앱(`apps/admin`). 읽기는 Supabase 직접, **쓰기는 Go admin API 단일 경로**(권한검증+입력검증+감사로그+연쇄삭제 통제). read-only로 과소평가 금지 — 웨딩 삭제·호스트 슬롯 이동·유저 수정 등 30여 admin operation 존재.
- **근거·의도**: 쓰기를 Supabase 직접쓰기로 흩지 않고 서버 1곳에 모아야 권한·감사·연쇄삭제를 통제. 권한은 이메일 allowlist 미들웨어 `AdminGuard(["/admin/"], cfg.AdminEmails())`가 `/admin/*` 전체를 메서드 무관 보호.
- **삭제 정책(사용자 확정)**: weddings=soft delete(`status='deleted'`), memories=soft delete(`deleted_at`), wedding_lounges·users=삭제 미제공(수정만), 그 외 hard delete. 응답 204 통일, 감사 로그는 기존 `admin_audit_logs` 재사용.
- (출처: docs/onboarding.md §4, docs/architecture.md §12, code/api-go.md §1·§5-8, CLAUDE.md §2)

### 결정: display(현장 디스플레이)는 경계 밖(추후)
- **맥락**: 레거시 mecdisplay를 guest-web `/display`로 포팅하는 시나리오가 있음.
- **결정**: 디스플레이(QR 메시지 현장 표출)는 APP_SCOPE 두 앱 범위 밖 — 추후 별도 구현, 현재 미구현.
- (출처: docs/onboarding.md §4·§18, docs/architecture.md §7)

---

## F. 상태 관리 — xState 전면 머신화 (2026-06 개정)

### 결정: 모든 페이지·컴포넌트의 flow는 xState machine으로 관리. flow를 useState로 관리하는 코드는 작성 안 함
- **맥락**: 프론트 상태 관리 컨벤션 전면 개정.
- **결정**: flow(상태 전이)는 xState machine으로 관리하고 `invitationCreate.machine.ts`를 기준 패턴으로. 역할 분담 — xState=flow 제어, zustand=폼 데이터 값, TanStack Query=서버 상태 캐시+fetch lifecycle. 단순 흐름(상태 1~2개)도 단일상태 reducer형 머신으로 표현.
- **근거·의도**: flow가 useState로 흩어지면 어떤 상태에서 뭐가 가능한지가 코드 전체에 퍼져 검증 불가. 머신으로 모으면 flow를 한 곳에서 시각화·테스트.
- **영향**: 머신 밖 예외는 순수 UI 토글(isOpen/mobileTab/focusedSection/animPlayKey)·서버 fetch·폼 필드 값으로 한정. 머신 정의가 React Query mutation·캐시 무효화를 직접 호출 금지 → `input` 콜백으로 주입.
- (출처: docs/architecture.md §10, docs/code-convention.md §6)

### 결정: 머신은 TDD로 작성(작성 시 강제). 병렬 항목은 오케스트레이터+서브머신, 설계/시뮬 전용 머신 허용
- **맥락**: 머신화 전수 작업을 /run-tasks 루프로 진행하며 검증 게이트가 필요.
- **결정**: xState machine은 작성 시 TDD 강제(매트릭스). 병렬 독립 항목(예: 파일별 이미지 업로드)은 머신 전체를 단계로 나누지 않고 단일 상태 + items[] reducer + 서브머신 actor invoke. 프로덕션 thin 머신과 별도로 한 화면 전체 flow를 펼친 "설계/시뮬 SSOT" 머신을 둘 수 있고 첫 줄에 `[설계/시뮬 전용 — 프로덕션 미연결]` 명시(죽은코드 아님).
- **영향**: 컴포넌트 머신화는 CanvasEditor 1개로 확정(XS-22), 나머지(GiftForm·ComposeModal 등)는 폼값/표시 토글이라 제외. QrPage·DmPage는 흐름 0 정적 placeholder라 머신 제외.
- (출처: docs/architecture.md §10, docs/code-convention.md §2·§6)

---

## G. 테스트·완료 정직성 (거짓 완료 방지)

### 결정: "빌드 통과 = 맞다"가 아니다. Go 백엔드·온체인은 TDD(red→green), 완료엔 실검증 증거 첨부
- **맥락**: 이전 세션이 문서를 안 읽고 빌드만 통과시켜 의도와 어긋난 전제 위에 구현(L1).
- **결정**: service/handler 구현 전 `_test.go` 먼저, Move는 `sui move test` red→green. 코드 수정 후 빌드·테스트 통과 확인 후에만 보고. UI 완료 보고엔 Playwright 스크린샷 첨부.
- **근거·의도**: 빌드 통과는 "코드가 안 깨졌다"일 뿐 "의도대로 동작·렌더링된다"가 아님. 실호출/스크린샷이 동작의 증거.
- (출처: docs/onboarding.md §13(L1), docs/code-convention.md §2, CLAUDE.md §5)

### 결정: zkLogin 라이브 검증은 자격증명(Google OAuth client + ZK prover) 없으면 "자격증명 대기"로 명시 — 거짓 완료 보고 금지
- **맥락**: zkLogin은 헤드리스로 라이브 검증이 불가.
- **결정**: 자격증명이 없으면 완료로 보고하지 않고 "자격증명 대기"로 정직하게 명시.
- **근거·의도**: 검증 못 한 걸 완료로 보고하는 건 거짓 보고. 실제 검증 가능 여부를 보고에 반영.
- (출처: CLAUDE.md §5)

### 결정: 거짓 완료를 막기 위해 TaskUpdate 완료 게이트 hook 신설 + 독립 검증 에이전트로 적대 검증
- **맥락**: 자율 루프(/loop, /run-tasks)에서 태스크를 검증 없이 완료 처리하는 거짓 완료가 발생.
- **결정**: 매 태스크마다 독립 검증(opus) PASS 게이트를 통과해야 완료로 전환. TaskUpdate 완료를 막는 hook을 신설하고 run-tasks/create-tasks 스킬을 보강. 일부 태스크는 독립 검증에서 FAIL 판정이 실제로 나옴.
- **근거·의도**: 자율 에이전트가 "멈추지 말고 끝까지" 돌면 검증을 건너뛰기 쉬움 → 완료 전 의도 부합을 강제 검증해 거짓 완료 차단.
- (출처: session-intent-notes.md [A/28ba2a9b#4]·[A/28ba2a9b#7]·[A/25c842ba#0]·[A/84ad9997#0]·[A/fb685fff#0])

---

## H. 데이터 모델·도메인 그레인 결정 (구현 시나리오에서 확정)

> 주의: 이들은 주로 오프체인(digital-guestbook-v3) 구현 맥락의 결정이나, dibang-sui 도메인 모델 SSOT에 반영돼 온체인 설계의 입력이 된다. SSOT 충돌 시 도메인 모델 우선.

### 결정: LoungeCheckIn은 방문 이력이 아니라 멤버십 — user×lounge 정확히 1건(DB UNIQUE 강제) (AUD-0, 2026-05-19)
- **결정**: 재입장해도 행이 늘지 않음. "앱 레벨 보장"이 아니라 DB UNIQUE(user_id, lounge_id)로 강제(get-or-create는 `ON CONFLICT DO NOTHING` + 재조회 race-safe).
- **근거·의도**: 라운지 입장은 방문 횟수가 아니라 "그 라운지의 멤버인가"라는 멤버십 사실. 멱등이라야 신뢰 신호로 깨끗.
- (출처: docs/architecture.md §2·§4(LoungeCheckIn), docs/onboarding.md §5)

### 결정: 방명록 본문은 GuestbookMessage로 일원화 — `entries.message` 컬럼 드롭 (2026-05-25)
- **결정**: GuestbookEntry는 정체성 단위(누가·어느 라운지·어떤 관계), 본문은 GuestbookMessage(1:N 누적). 하트만일 때는 `__HEART__` sentinel.
- **근거·의도**: 정체성(Entry)과 글(Message)을 분리해야 피드/스토리 누적이 깔끔. 본문이 두 곳에 있으면 일관성 깨짐.
- (출처: docs/architecture.md §2(GuestbookEntry/Message), docs/onboarding.md §18)

### 결정: side 명칭을 recipient_slot(6슬롯)으로 통일, "MoiVisit/LoungeEntry" → LoungeCheckIn으로 네이밍 확정
- **맥락**: 구현 중 사용자가 네이밍을 직접 정정("side를 recipient_slot으로 다 바꿔라").
- **결정**: 6슬롯(groom/bride/groom_father/groom_mother/bride_father/bride_mother)을 가리키는 컬럼은 recipient_slot으로 통일. 라운지 입장 기록 명칭은 LoungeCheckIn.
- **근거·의도**: v3는 채널 분리 없이 host 슬롯 구조라 "측(side)" 대신 받는 사람 슬롯(recipient_slot)이 정확.
- (출처: session-intent-notes.md [C/0264e996#1]·[C/b2019784#0]·[C/75adee94#1], docs/architecture.md §2)

### 결정: 축의 장부는 wedding 단위 단일 장부(side 필터 없음). 호스트 초대는 신랑/신부만 발급, accepted는 취소 불가
- **결정(장부)**: wedding 단위 단일 장부, 시간순 고정, 수정 전 필드 가능/삭제 가능/중복 허용. Permission은 Host 전체(6슬롯).
- **결정(host-invite)**: inviter는 신랑/신부만(슬롯=부모 4+배우자), 초대 만료 없음, 같은 슬롯 pending이면 토큰 재사용, accepted면 취소 불가(pending만 cancel). 부모/배우자 Host는 라운지·웨딩리포트 접근 가능하되 청첩장 수정·추가만 제외.
- **근거·의도(취소 불가)**: accepted 취소 불가가 온체인 finality와 자연 정합.
- (출처: docs/scenario.md §4-4·§5(장부), docs/architecture.md §4(HostInvite)·§9, docs/onboarding.md §18)

### 결정: 복합 생성 — `POST /weddings` 한 번에 Wedding+WeddingLounge+MoiGatherPlace+MobileInvitation을 단일 트랜잭션으로
- **결정**: 결혼식 생성은 4개 엔티티를 서버 단일 트랜잭션으로 한 번에. 수정은 각각 분리(PATCH).
- **근거·의도**: 결혼식 셋업은 라운지·게더플레이스·청첩장이 항상 함께 있어야 의미 → 부분 생성으로 정합 깨지는 걸 방지.
- (출처: docs/architecture.md §8, docs/onboarding.md §18, code/api-go.md §5-1)

---

## I. 인프라·운영 결정

### 결정: 온체인↔오프체인은 dual-write로 연결 — `PATCH /weddings/{id}/sui-ids`로 Sui 오브젝트 ID 역기록 (C7)
- **결정**: 온체인 발행 후 그 Sui 오브젝트 ID를 오프체인 DB에 역기록. `Wedding.sui_wedding_id`/`sui_vault_id`, `lounges.sui_lounge_id` 컬럼 + `updateWeddingSuiIds`(bearer). nil 인자는 변경 안 함.
- **근거·의도**: 온체인과 Supabase를 점진 병행하는 동안 두 세계의 ID를 잇는 다리가 필요(완전 대체 전까지의 브릿지).
- **영향**: Supabase는 "아주 어쩔 수 없을 때만 사용(최후수단)"이라는 방향 아래의 과도기 장치.
- (출처: code/packages-sdk.md §types.gen/온보딩 시사점, code/api-go.md §5-1, docs/onboarding.md §15)

### 결정: 청첩장 Create 흐름의 편집 중 업로드는 `invitation-draft`(tmp) → 저장 확정 시 이동 (안 A, 2026-06-10 사용자 승인)
- **맥락**: InvitationCreatePage는 저장 시점에야 wedding이 생겨 편집 중엔 weddingId가 없음 → presigned `mobile-invitation`(weddingId 필수)을 못 씀.
- **결정**: 편집 중 업로드는 신규 카테고리 `invitation-draft` → `v3-tmp/{userId}/{uuid}{ext}`(public 버킷). 저장 확정 시 서버가 tmp key 감지 → copy로 `v3-mobile-invitation/{weddingId}/...`에 복사 → 참조 재작성 → tmp 원본 삭제. 버려진 tmp는 TTL sweep.
- **근거·의도**: 대안 A′(tmp private)는 미리보기 signed URL 비용, B(draft wedding 선행 생성)는 도메인 광역 영향 → 미채택. tmp를 public에 두면 미리보기가 공개 URL을 그대로 써서 FE 변경 없음.
- (출처: docs/architecture.md §11, code/api-go.md §5-5)

### 결정: Supabase 마이그레이션은 이력 남는 정석 경로만 — apply_migration/execute_sql DDL/Dashboard 직접 실행 금지
- **맥락**: 2026-05-26 마이그레이션 version 어긋남 사고, prod 35개 orphan 사고.
- **결정**: `psql -f` 직접 적용·MCP `apply_migration`(version 어긋남)·`execute_sql` 임시 DDL·Dashboard SQL Editor DDL 직접 실행·`db push --include-all` 무작정 사용 금지. prod 마이그레이션은 사용자가 직접 터미널 실행, dev 먼저 → prod 별도 승인.
- **근거·의도**: 이력 안 남는 경로로 스키마를 바꾸면 dev↔prod 마이그레이션 트랙이 어긋나 데이터 사고로 이어짐(실제 발생).
- (출처: docs/code-convention.md §migrations, session-intent-notes.md [C/5e2939ac#0]·[C/fdd2f418#0])

### 결정: 보안·구현 방식은 안전하고 정석적인 방법 우선 — 자체 시크릿 검증보다 인증 서버 위임
- **맥락**: 구현 방식이 여러 개일 때의 선택 기준.
- **결정**: 보안적으로 안전하고 정석적인 방법을 기본 선택(예: 로컬 시크릿 검증보다 인증 서버 위임, 하드코딩 시크릿보다 환경변수, 자체 구현보다 검증된 라이브러리/서비스). 정석이 아닌 방법은 이유 명시 + 사용자 승인.
- **영향**: AuthMiddleware가 Bearer 토큰을 Supabase Auth API로 검증 위임(자체 검증 안 함). 안전·정석 규칙을 CLAUDE.md에 추가.
- (출처: 전역 CLAUDE.md §1-1, code/api-go.md §1, session-intent-notes.md [C/c3bd9dda#1])

---

## J. 메타·작업 방식 결정

### 결정: 설계·구현 시작 전 필독 문서를 반드시 읽는다 (안 읽고 시작 금지)
- **결정**: VISION-AND-INTENT → 00-READ-FIRST → DOMAIN_MODEL_SUMMARY(SSOT) → 작업 대상별 02·04·05·06·08 순으로 읽고 시작.
- **근거·의도**: 이전 세션이 문서를 안 읽고 Move·SDK·zkLogin을 구현해 의도와 어긋난 전제 위에 세웠음(L1·L2·L3·L4 전부 미독에서 발생).
- (출처: docs/onboarding.md §16, docs/research-and-claude.md B0, CLAUDE.md §0)

### 결정: SSOT 우선순위 확정 — VISION(왜/방향) > DOMAIN_MODEL(무엇) > scenario(어떻게). 충돌 시 위가 이긴다
- **결정**: `_scenario/*`는 구현용이라 도메인 모델과 어긋날 수 있고, 어긋나면 도메인 모델을 따른다. "왜/방향"의 원천은 VISION-AND-INTENT.
- **근거·의도**: 진실의 원천을 한 곳으로 고정해야 문서 간 충돌에서 흔들리지 않음. 추측 금지, 실제 문서·코드·온체인 상태로 확인.
- (출처: docs/onboarding.md §2, docs/research-and-claude.md B1, CLAUDE.md §1)

### 결정: 설계 문서에서 축약형 금지, REST 분류 기준은 path 첫 세그먼트로 통일
- **결정**: 설계·기획 문서에서 축약형(DW/GW, R/W 등) 금지(사용자가 먼저 쓰거나 동의한 경우만). REST 엔드포인트 분류의 유일 기준은 path 첫 세그먼트 — 매핑 문서 섹션 = spec 주석 블록 = 첫 tag 세 곳이 일치.
- **근거·의도**: 축약·기준 불일치가 문서 간 혼선을 만듦. 한 기준으로 고정.
- (출처: docs/architecture.md §14(LESSON))
