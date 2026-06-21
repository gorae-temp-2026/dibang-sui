# dibang-sui 온보딩 — 한 장 요약 (SUMMARY)

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> 700MB 대화기록(160세션) + 현 프로젝트 문서·코드를 6단계로 정제·합성한 온보딩의 **1페이지 요약**.
> 깊이가 필요하면 → `HANDBOOK.md`(메인), `DECISION-LOG.md`, `INTENT-TIMELINE.md`, `FAQ.md`, `GLOSSARY.md`.
> 충돌 시 진실원천 우선순위: `_onboarding/VISION-AND-INTENT.md`(왜) → `_architecture/DOMAIN_MODEL_SUMMARY.md`(무엇, SSOT) → `_scenario/*`(어떻게).

## 한 문장
디방은 겉보기엔 **결혼식 디지털 방명록·라운지 서비스**지만, 진짜 목표는 그 상호작용을 **Sui 온체인에 올려 관계별 신뢰잔액 → 신용 → DeFi**로 잇는 **신뢰네트워크 기반 신용 프로젝트**다. 결혼식은 한 사람의 신뢰망을 일생 1회 전수 샘플링하는 진입점일 뿐이다.

## 왜 (Vision)
- **신뢰→신용→DeFi 4층 사다리**: ①분류(완성) ②동역학/fold(골격) ③신용 전파 Φ(시제품) ④금융 상품(미구축). 해커톤(Sui Overflow 2026, Payment & DeFi) 목표 = **3↔4층을 실제로 잇기**.
- 축의금은 단순 지불이 아니라 **호혜 원장**(갚아야 할 장부) — 거래와 구조가 다름. 이게 신용의 핵심 원료.
- **정직 경고**: 신용 가중치(0.5/0.3/0.2 등)는 전부 first-cut 임의값. 정식 모델은 실데이터 보정 필요.

## 무엇 (도메인·앱 경계)
- 도메인 핵심: **Moi(관계 신뢰잔액)·Ium(이음)·신뢰잔액**, Wedding/Lounge/Guestbook/CashGift/RSVP, 역할 Host/Guest/Manager. **Moi·Ium·GatherPlace 등 신뢰네트워크는 미구현 그린필드**(전환이 아니라 신규 구축).
- **앱 경계(절대 혼동 금지)**: `guest-web`=비로그인 익명 전환 퍼널 / `dibang-wedding`=로그인 본체(zkLogin·온체인 신원·신뢰네트워크) / `admin`=운영. ⚠️ **현실 차이**: 코드상 guest-web에 zkLogin/온체인 경로가 dev keypair로 실재 — 규칙과 코드가 어긋난 지점(HANDBOOK §2-3).

## 어떻게 (아키텍처·온체인·컨벤션)
- **온체인 = raw 액션 원장만**(action_type·actor·target·event·role). 신뢰 해석은 저장하지 않고 **규칙으로 계산**(재해석 가능성 보존).
- **활동·관계 기록 = SBT(`key`-only, transfer 불가)**, 거래/선물 자산만 `store`. ⚠️ 정정 대상 3건(GuestbookEntry·CashGiftRecord·Ium)이 아직 `key+store`로 남아 미반영.
- **인증**: zkLogin(Google 로그인 + sponsor 가스 대납) — 호스트도 지갑·SUI 없이 실행. **dual-write**(Supabase 생성 후 온체인 ID 역기록, 온체인 실패는 격리). Supabase는 최후수단.
- **보안**: sponsor는 전 커맨드 화이트리스트 검증(가스코인 인자 커맨드 거부 — 실제 발견된 CRITICAL). zkLogin fail-open→fail-closed.
- **컨벤션**: 상태=xState v5 머신화(useState로 flow 금지), TDD 강제(Go·hook·머신·Move), 데이터페칭은 `@gorae/contracts` 생성코드만.

## 지금 상태
- testnet 배포·온체인 7종 실증(웨딩/방명록/Moi/Ium/Vault/축의/RSVP) 단계. **mainnet 미배포**(해커톤 상금 50%는 mainnet 후).
- 신뢰네트워크·신용 모델은 그린필드. 프론트는 온체인 쓰기 단일 통로(`useOnchainHostActions`→`executeOnchain`) 구축.

## 가장 비싼 교훈 (반복 금지)
- **빌드 통과 ≠ 의도 정합 ≠ 온체인 성공.** 과거 "DEV 테스트 버튼만 만들고 거짓 완료 보고" 적발 → **적대적 완료 검증 게이트** 도입.
- 문서 SSOT 우선, 앱 경계 혼동 금지, 민감정보(이름 등) 온체인 평문 금지.

## 신규 팀원 첫 걸음
1. `_onboarding/VISION-AND-INTENT.md` → `00-READ-FIRST.md` → `_architecture/DOMAIN_MODEL_SUMMARY.md` 정독.
2. 이 폴더의 `HANDBOOK.md` 통독 → `GLOSSARY.md`로 용어 → `FAQ.md`로 헷갈리는 점 → `DECISION-LOG.md`/`INTENT-TIMELINE.md`로 맥락.
3. 코드 만지기 전 `CLAUDE.md`(전역+프로젝트) 규칙 확인.
