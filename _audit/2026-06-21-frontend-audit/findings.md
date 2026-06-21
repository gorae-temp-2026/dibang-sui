# 프론트엔드 전수 감사 — 상세 findings (2026-06-21)

모든 항목 `파일:라인 — [심각도] 설명`. 디스크 현재 기준. CRITICAL=빌드/동작 차단, HIGH=런타임 오류·기능 미동작, MED=논리·UX, LOW=정리.

---

## 0. 빌드 상태 (tsc -p tsconfig.app.json --noEmit, 직접 확인 = 11 errors)

- `lib/loungeV2Feed.ts:106` — **[CRITICAL]** `WARMTH_STEPS` 미import (TS2552). `types/lounge-v2.ts:46`에 export 있으나 import 블록 누락. `warmthStep`은 `MoiGatherPage.tsx:21` 라이브 사용 → 빌드 깨짐. `loungeV2Feed` 테스트 없어 미커버.
- `pages/MyWeddingPage.tsx:122,123` — **[CRITICAL]** `WeddingSummary`에 `sui_wedding_id`/`sui_vault_id` 없음 (TS2339×3). sui 필드는 `WeddingDetail`에만. 빌드 우회해도 런타임 `undefined` → 출금·공동혼주 섹션 영구 비활성.
- `machines/addHost.machine.test.ts:20`, `moiGate.machine.test.ts:33`, `onchainTx.machine.test.ts:17` — **[CRITICAL]** `fromPromise(throw-only)` 반환 `never`가 actor `string` 시그니처와 불일치 (TS2322×3). 머신 actor 타입 변경에 테스트 미추종.
- (그 외 4건은 본 감사 영역 밖.)

## 1. [A·xState] 적용 인벤토리 (#51)

- **orphan 머신 2개 — [LOW]**: `machines/invitationCreate.design.machine.ts`(헤더에 "Stately 설계용·프로덕션 미연결" 명시), `machines/uploadItem.machine.ts`(design 머신만 spawn, "설계/시뮬용"). XS-9 정리 대기.
- **머신 없는 페이지**: `DmPage.tsx`(미구현 placeholder — 현재는 OK이나 DM 구현 시 비동기 머신 필요 [LOW]), `MoiCreditGuidePage`·`SignalGuidePage`(정적 가이드 — OK), `QrPage`(placeholder — OK).
- **uploadItem self._parent — [MED]**: `uploadItem.machine.ts:109-116` `reportDone/reportFailed`가 xState 비공개 `self._parent`에 의존(정석은 `sendParent`). 버전업 시 깨짐.
- **공통 flow 머신 파편화 — [MED·구조]**: 온체인 액션이 `onchainTx`/`addHost`/`moiGate`/`network`/`invitationCreate.design`로 제각각. `onchainTxMachine`은 `WithdrawSection` 1곳만. 공통 서명 지점은 `executeOnchain` 하나지만 flow는 공통 아님.
- 전반 커버리지는 양호(대부분 페이지가 머신 사용, React Query SSOT 분리 일관).

## 2. [C·정합성] 컨트랙트↔프론트 (#52)

- **매트릭스 config 미주입 — [HIGH]**: `providers/ZkLoginProvider.tsx:36` `configureSui({network, packageId})`만. `csMatrixId`/`emMoneyMatrixId`/`trustRegistryId` 미주입(`packages/sui-sdk/src/constants.ts:27-30` TESTNET_CONFIG에도 없음). → `requireMatrixId`(constants.ts:55-62)를 부르는 `buildInvite/RequestIum/AcceptIum/Gift/Give/Participate/Write`Tx가 호출 즉시 throw. **`useOnchainHostActions.ts`가 invite(58)/gift(108)/acceptIum(102)/requestIum(98)을 live로 export**하므로, 그 흐름이 배선되면 즉시 깨짐.
- **시그니처는 대체로 정합**: `add_host`/`withdraw`/`invite`/`create_wedding`/`create_vault` 인자 순서·개수 OK(에이전트 교차확인).
- **제거함수 오탐 주의 — [INFO]**: `GuestbookEntry`/`claimGuestbookEntry` 참조(`useJoinWeddingFromParam.ts`, `FeedItemGuestbookEntry.tsx`)는 **Go 백엔드 API(`@gorae/contracts/sdk.gen`)**이지 Move의 제거된 `GuestbookEntry`가 아님 → Move 정합 위반 아님.
- give/write 빌더는 앱 미사용(hook 없음, #20/#21 backlog). participate 빌더는 신규(미사용).

## 3. [#53] 인증/온보딩/zkLogin

- `ZkLoginProvider.tsx:92-152` — **[HIGH]** `login()`/`completeLoginFromUrl()` 호출처 0 → real zkLogin 로그인 죽은 코드. 실로그인은 Supabase OAuth + dev 키페어뿐.
- `AuthCallbackPage.tsx` 전체 — **[HIGH]** Supabase 세션만 대기, zkLogin `#id_token` 해시 미처리. zkLogin 끝까지 연결 안 됨.
- `ZkLoginProvider.tsx:78`+`sui-sdk/zklogin.ts:153` — **[HIGH]** `loadSession`이 `maxEpoch` 만료 미검증. 만료 세션도 `isAuthenticated=true`, 만료는 온체인 실패 시점에야 노출. 재발급 로직 없음.
- `AuthCallbackPage.tsx:38-44` — **[MED]** 10초 타임아웃이 성공 후에도 살아 경합, `/login` 튕김 여지. PKCE code 교환 실패 전용 분기 없음(38-44 모든 실패가 "10초→/login").
- `AuthProvider.tsx:16-21` — **[MED]** `getInitialSession` `.catch` 없음 → 초기 getSession 실패 시 `isReady` 영영 안 켜져 `null` 렌더로 멈춤.
- `onboardingConsent.machine.ts:28` — [LOW] `RETRY` 죽은 이벤트. `LoginPage.tsx:47-59` — [MED] dev 세션이 `?redirect` 무시하고 `/my-wedding` 고정.

## 4. [#54] 청첩장 생성/편집

- `queries/invitation-edit/useUpdateWedding.ts:23` — **[HIGH]** `hasInvitationData`에 `design_config`/`cover_text_config` 누락 → Edit에서 디자인-only 변경 시 `updateInvitation` 미호출, 변경 유실되는데 success로 navigate. 생성/추가(`useSaveInvitation`/`useAddInvitation`)와 비대칭.
- `machines/invitationCreate.machine.ts`(저장 가드) — **[MED]** Create는 slug 길이만 검사, `available` 재검증 없음 → 모달 통과 후 slug를 taken으로 바꿔도 저장. Edit(`slugNotAvailable` 가드)과 비대칭. 중복 slug 위험(서버 유니크에만 의존).
- `useSaveInvitation.ts:42` — **[MED]** `invitations[0]?.id ?? ''` → 응답에 invitation 없으면 빈 invitationId로 `updateInvitation` 호출(무방비 서버 에러). best-effort 격리 설계(52-79)는 의도대로지만 sui_id=null 무알림(81 반환값 미사용).
- `useInvitationImageUpload.ts:61-72` — [MED] 업로드 중 remove 시 머신 가드로 누수는 없으나 서버 PUT 미취소(고아 객체). `invitationCreate.design.machine.ts` — [INFO] 죽은 코드(미연결).

## 5. [#55] 마이웨딩/공동혼주/출금/초대수락

- `MyWeddingPage.tsx:122-123` — **[CRITICAL]** (0번) sui 필드 부재 → 빌드+기능 차단.
- 매트릭스 throw — **[HIGH]** (2번) invite 등. 단 invite는 호출처 0(NetworkPage 주석) → 청첩장 초대의 온체인 CS 기록 실제 미발생.
- `AddHostSection.tsx:29-30`+`queries.ts:190` — **[MED]** `getWeddingCapForWedding`이 wedding_id만 매칭 → 공동혼주 Cap도 통과시키나, `add_host`는 `ENotPrimaryHost`(wedding.move:119)로 abort. 사전 게이트("Cap 있음=추가가능")와 컨트랙트 게이트(primary만) 어긋남 → raw move abort 노출.
- `WithdrawSection.tsx:30-31,51` — **[MED]** 잔액 초과 사전검증 없음(`sui>0`만). 표시 잔액을 상한에 미사용 → `EInsufficientBalance` raw abort. [LOW] vault null과 로딩 미구분, done 후 RESET 버튼 없음, 성공 후 잔액 refetch 누락(MoiGateModal은 refetch하는데 비대칭).
- `HostInviteAcceptPage.tsx:16,31` — [LOW] 수락이 DB-only, 온체인 add_host와 미연결("초대수락→공동혼주"의 온체인 측 비어 있음).

## 6. [#56] 라운지

- `lib/loungeV2Feed.ts:106` — **[CRITICAL]** (0번) WARMTH_STEPS.
- `components/lounge-v2/FeedCardModal.tsx:85` — **[MED]** 5초 자동전환 effect dep에 불필요한 인라인 `onClose` → 실시간 리렌더마다 타이머 리셋, 자동넘김 굶음.
- `FeedCardModal.tsx:43-48` — **[MED]** 모달 열린 채 `groups` 변하면 `itemCounts` stale(OPEN 시점 고정) → 진행바와 머신 경계 불일치.
- `lib/loungeV2Feed.ts` 전반 — **[MED]** "온기"가 온체인 신호 아닌 DB 피드 파생(`credit`/`getSignalEvents` 미import)인데 타입 주석은 "Moi Credit과 가중치 공유". SSOT(온체인)↔표시 불일치, 전환기 표식 없음.
- `useRealtimeChannel.ts:40` — [LOW] deps에 `onChange`/`event` 제외(현 사용처는 무해, 일반화 시 stale 위험). 구독/해제 누수는 없음. 체크인 게이트·storyCarousel·liveCelebration 가드는 정상.

## 7. [#58] 모이/모이광장/샵/선물

- `gift.machine.ts:48-54,96-117` — **[CRITICAL]** 선물=100% mock(`buildGiftTx` 미사용, setTimeout). signals 적립도 in-memory.
- `moiPlaza.machine.ts:64-71` — **[CRITICAL]** 샵 구매 mock(`purchaseItem` hook 미호출).
- `useOnchainHostActions.ts:86-92` — **[CRITICAL]** equip/unequip 데드코드. 실제는 in-memory 문자열 토글.
- **요네 지갑 분열 — [CRITICAL]**: 광장(`moiPlaza` 300, 페이지-로컬) vs 선물(`giftActor` 500, 전역). `YoneChargeSheet`는 giftActor에만 CHARGE → 충전해도 샵 잔액 안 늘고 화면마다 요네 숫자 다름.
- `YoneChargeSheet.tsx:19-25,50-64` — **[HIGH]** 가짜 주소·"네트워크 처리 중" 표기·SUI 0원 차감(데모 고지는 있음). "1000요네≈1SUI" 환율 허구.
- `MoiGateModal.tsx` — **[CRITICAL]** Moi 게이트가 인연에만, 정작 Moi/MoiItem 쓰는 샵·선물엔 게이트 없음. 온체인 Moi 생겨도 mock 경제가 안 씀 → 두 세계 단절. [HIGH] 강제 모달(닫기 없음) → createMoi 영구실패 시 잠금 위험.
- 요네 정체성 모순 — [MED]: `gift.machine.ts:3`("요네=화폐, 신호 제외") vs `MoiCreditGuidePage.tsx:64`("선물=신뢰 신호"). `ChatScreen.tsx:55-58` 선물 답례 자동 mock이 신호 적립 오염.

## 8. [#59] 원장/신용/시그널

- `hooks/useCredit.ts:15,30` — **[HIGH]** `useCredit`/`useWalletCredit` 호출처 0(데드 배선) → 신용이 화면에 안 보임. `credit.ts:192` `signalBreakdownFor`도 테스트만.
- `lib/credit.ts:136-148` — **[HIGH]** `fold`가 `kind`만 분기, `resource_id` 미사용 → 다자원 EM 추가 시 환산불가 합산 버그(잠복).
- 온체인 TrustMatrix ↔ 오프체인 credit.ts — **[MED]** 같은 PHI-5 전파를 손동기 이중구현(cross-check 테스트 없음), 정밀도 모델 다름(fixed_point 정수 vs double). 진실원천은 문서상 온체인으로 명확(모순 아님)이나 드리프트 취약. 경계(온체인=π까지/오프체인=최종신용)가 한 곳에 명문화 안 됨.
- `credit.ts:78,90` — **[MED]** 부조 magnitude를 `number`로 누적 → recv 합산 2^53 MIST(≈900만 SUI 총액) 초과 시 정밀도 손실. SDK `asNumber`는 "금액은 BigInt 권고"인데 신호 magnitude만 number(자기 권고 불일치). 빈 신호/0분모 처리는 견고. LedgerPage는 DB 장부(신용 무관) — 정상.

## 9. [#60] 메모리북/공유사진/설정/기타

- `SharePhotoUploadPage.tsx:177-213`+`sharePhotoUpload.machine.ts:95-98` — **[HIGH]** 부분 실패가 "성공"으로 표시(실패분 버림, done 화면에 재시도 없음).
- `sharePhotoUpload.machine.ts:113-119,168` — **[HIGH]** `existingCount` input 1회 주입 → "계속 올리기"/재진입 시 옛 카운트로 100장 가드 무력.
- `SettingsPage.tsx:48-49,68-73` — **[MED]** 마케팅 토글 낙관적 override가 mutation 실패 시 롤백·알림 없음 → 체크박스 서버값과 영구 불일치.
- `WeddingMemoryBookCuratePage.tsx:155-168` — [MED] 머신 save축↔React Query `isPending` 이중 진실원천 경합. `:139-146` navigate `setTimeout(600ms)` cleanup 없음. `WeddingMemoryBookPage.tsx:60` — [MED] 머신 error state와 `!data` 가드 이중처리(머신 우회).
- `sharePhotoUpload.machine` 테스트 부재 — [MED] 5개 중 가장 복잡한데 회귀 보호 없음. `QrPage`/`DmPage` placeholder — [INFO].

## 10. [#61] onchainTx 공통 인프라

- 매트릭스 미주입 throw — **[HIGH]** (2번 재확인). 7개 빌더 시한폭탄.
- `useSaveInvitation.ts:52-79` — **[MED]** best-effort dual-write 부분성공 누수: 온체인 Wedding 발행 성공 + DB sui_id 기록(`throwOnError`) 실패 시 → 온체인 있고 DB null인 고아, 재시도 중복발행 위험. digest 미영속(idempotency 없음).
- `executeOnchain`(ZkLoginProvider.tsx:161-199) — [MED] 재시도·타임아웃·idempotency 없음. best-effort 삼킴이 호출처별 산재(일관성 없음).
- `MoiGateModal.tsx:50-74` — [MED] 닫을 수 없는 게이트 + 실패 시 갇힘(영구 실패 시 앱 사용불가).
- `onchainTx.machine.ts`/`WithdrawSection.tsx:75` — [LOW] 출금 성공 후 vault 잔액 invalidate/refetch 누락. `invitationCreate.design.machine.ts:128` — [LOW] 스텁 온체인 경로(死文).

---

## 교차검증 / 모순 종합

- **mock↔real 단절(주제 A)**: #57·#58·#59·#56이 독립적으로 같은 결론 — "온체인" 카피·주석 vs mock/DB 실제. 온체인 훅 전반 데드코드. (4개 에이전트 교차확인 → 고신뢰.)
- **매트릭스 미주입(주제 B)**: #52·#55·#58·#61이 동일 지적(`configureSui` 매트릭스 누락 → builder throw). 단 현재 mock이라 미발현. (4개 교차확인.)
- **빌드 깨짐**: #55·#56 지적 + 직접 tsc로 11건 확정.
- 진실원천 혼선은 **아니다** — 설계 문서(온체인=SSOT)는 일관. 문제는 *구현이 거기 못 따라간 미배선/전환기 상태*.
