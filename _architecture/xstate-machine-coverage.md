# xState 머신화 대상 전수표 (XS-D0 산출물)

전면 머신화(2026-06 방침)의 대상·현황·담당 태스크 추적표. 컨벤션 SSOT는 `_code_convention/STATE_MANAGEMENT.md`.

## 기준 패턴 — invitationCreate.machine.ts
- `setup({ types, guards, actions }).createMachine({ id, context, initial, states })` (xState v5).
- 머신 = **flow 제어만**(앱/서버 의존성 직접 호출 금지 — `input` 콜백 주입; 순수 헬퍼 import는 허용). 비동기 연결은 두 패턴 허용: **(a) 컴포넌트 회신형**(send→전이→컴포넌트가 Query 호출→결과 send, 예 invitationCreate), **(b) actor invoke형**(`fromPromise`/`fromCallback` actor를 invoke하되 외부 의존성은 머신 `input`으로 콜백 주입, 예 sharePhotoUpload). 상세는 STATE_MANAGEMENT.md §machine 작성 규칙 4.
- 폼 값 = zustand, 서버상태 = React Query, 머신 context = flow 메타(toast/error 등).
- named guard/action 분리. `state.matches()`로 분기 렌더, `send()`로 이벤트, `state.context`로 UI.
- `@xstate-layout` 주석으로 Stately/inspect 시각화 호환.

## 등급 기준
- ✅ 제대로: 다중상태+전이+context를 의미있게 가지고, 사용처가 matches/send/context 모두 실사용(머신 떼면 화면 깨짐).
- △ 부분: 한 축이 얕음(단일상태 reducer형이나 사용처 활용 부분적, 또는 죽은 코드).
- ❌ 허울: state를 안 읽어 머신 떼도 동작 동일.
- **단순 흐름은 단일상태 reducer형 머신 허용**(△ 아님, 의도된 형태로 인정 — 단 사용처가 send/context 실사용해야).

## 페이지 — dibang-wedding
| 페이지 | 현황 | 담당 태스크 |
|---|---|---|
| InvitationCreatePage | ✅ 기준 | — |
| LoungeCheckInGatePage | ✅ | — |
| SharePhotoUploadPage | ✅ | — |
| LoungeFeedPage | △(죽은 guard/ctx) | XS-2 |
| LoungeV2Page | △(죽은 guard/ctx) | XS-3 |
| OnboardingConsentPage | △(guard 중복) | XS-4 |
| InvitationEditPage | 없음(머신 정의만) | XS-7 |
| MyWeddingPage | 없음 | XS-10 |
| WeddingListPage | 없음 | XS-11 |
| NetworkPage | 없음 | XS-12 |
| LedgerPage | 없음 | XS-13 |
| WeddingMemoryBookPage | 없음 | XS-14 |
| WeddingMemoryBookCuratePage | 없음 | XS-15 |
| HostInviteAcceptPage | 없음 | XS-16 |
| SettingsPage | 없음 | XS-17 |
| QrPage | 흐름 0 정적 placeholder | XS-18 ➖ **머신 제외**(미구현 카메라 스캐너 자리; 상태/비동기 0. 스캐너 구현 시 권한/스캔 flow 머신 도입) |
| DmPage | 흐름 0 정적 placeholder | XS-19 ➖ **머신 제외**(미구현 다이렉트 메시지 자리, 8줄; 상태/비동기 0. DM 구현 시 대화/전송 flow 머신 도입) |
| LoginPage | 없음 | XS-20 |
| AuthCallbackPage | 없음 | XS-21 |

## 페이지 — guest-web
| 페이지 | 현황 | 담당 태스크 |
|---|---|---|
| GuestFlowPage | ✅ | — |
| InvitationPage | 없음(머신 정의만, invitationPageMachine) | XS-8 |
| DisplayPage | ❌ → ✅(위 XS-1) | XS-1 |
| MobileInvitation | 프로토타입 — 대상 제외 |

## 훅 / 보조 머신
| 대상 | 현황 | 담당 |
|---|---|---|
| useInvitationImageUpload (invitationImageUpload.machine) | △(단일상태 reducer) | XS-6 |
| invitationCreate.design.machine / uploadItem.machine | **설계/시뮬 전용 SSOT**(Stately 완전펼침 시각화 — 프로덕션 미연결은 의도, 죽은코드 아님; 첫 줄 주석에 명시) | XS-9 ✅ 명문화·유지(시각화 자산) |

## 컴포넌트 머신화 대상 (useState 3+) — XS-22
| 컴포넌트 | useState | 비고 |
|---|---|---|
| invitation-create/CanvasEditor.tsx | 11 | XS-22 ✅ **머신화 대상**(tool 모드 select/draw/image + imageTab + uploading 전환 flow; 그리기 고빈도·객체 선택은 캔버스 로컬 ref/useState 유지) |
| my-wedding/WeddingCard.tsx | 6 | XS-22 ➖ 제외(독립 모달/캐러셀 토글 — 상호 무관, 표시 예외) |
| ledger/GiftForm.tsx | 6 | XS-22 ➖ 제외(순수 폼값 5 + isValid 파생 + onSubmit, flow 0; 액션은 부모 LedgerPage mutation) |
| invitation-create/PreviewPanel.tsx | 6 | XS-22 ➖ 제외(DOM ref + 선택 토글, 표시 예외) |
| invitation-create/LetteringDrawBoard.tsx | 6 | XS-22 ➖ 제외(캔버스 그리기 — pointer 고빈도 + tool/color/width 로컬 설정 + redo 히스토리; 저빈도 의미전이 머신 부적합) |
| memorybook/DisplayWeddingMemoryBook.tsx | 5 | XS-22 ➖ 제외(슬라이드/애니메이션 표시) |
| lounge-v2/ComposeModal.tsx | 4 | XS-22 ➖ 제외(폼값 text/photoFile + 미리보기 objectURL; 업로드·게시 flow는 부모 props) |
| invitation-create/PhotoPositionModal.tsx | 4 | XS-22 ➖ 제외(크롭/줌 값 — react-easy-crop 폼값) |
| memorybook/MemoryBookV2_4Inner.tsx | 3 | XS-22 ➖ 제외(반응형/스크롤 표시 토글) |
| lounge-v2/FeedCardModal.tsx | (storyCarousel △) | XS-5에서 보강 완료 |
| guest-flow/StepNameRelation·StepRecipient·StepMessage·StepAmount | 3~6 | guestFlow 머신 **하위 스텝** — 로컬 입력은 상위 흡수(별도 머신화 안 함) |

## 우선순위
1. **Phase 1 보강**(XS-1~6): 허울(display) → 죽은코드(loungeFeed/V2) → 중복(onboarding) → storyCarousel/imageUpload.
2. **Phase 2 연결**(XS-7~9): 정의만 있는 머신 활성화 + 미사용 정리.
3. **Phase 3 신규**(XS-10~21): 머신 없는 페이지 — db/sui 액션 있는 것(Network/Ledger/MyWedding) 우선.
4. **Phase 4 컴포넌트**(XS-22): CanvasEditor·GiftForm·ComposeModal(상태/액션 복잡한 것) 우선.

## 제외(머신 밖, useState 허용)
- flow와 무관한 순수 UI 표시 토글(boolean 한정 아님, 다른 상태 무관) — STATE_MANAGEMENT.md 예외 규칙.
- MobileInvitation(프로토타입).
- **QrPage(XS-18)** — 흐름 0 정적 placeholder(미구현 카메라 스캐너 자리, 상태/비동기 0). 빈 머신 강제는 죽은코드(XS-D0 위배)라 제외. 스캐너 구현 시 권한/스캔 flow 머신 도입.
- **DmPage(XS-19)** — 흐름 0 정적 placeholder(미구현 다이렉트 메시지 자리, 8줄, 상태/비동기 0). 빈 머신 강제는 죽은코드라 제외. DM 구현 시 대화/전송 flow 머신 도입.
- **XS-22 컴포넌트 제외**(평가 결과): 폼값/미리보기(GiftForm·ComposeModal·PhotoPositionModal), 독립 모달/선택 토글(WeddingCard·PreviewPanel), 슬라이드/애니메이션 표시(DisplayWeddingMemoryBook·MemoryBookV2_4Inner), 캔버스 그리기 고빈도(LetteringDrawBoard). → 컴포넌트 머신화는 **CanvasEditor 1개**(모드 전환 flow)로 확정.
