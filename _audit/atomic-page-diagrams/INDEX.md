# 페이지별 원자 단위 상태/액티비티 다이어그램

> 18개 라우팅 페이지 전부 **실제 런타임 코드 정독 → Mermaid 작성 → Opus 4.8 코드 대조 검증(숨은 분기·동시성 0) → `.md`(mermaid)+`.html`(렌더)** 로 완성. **진행 18 / 18 ✅**

> 보는 법: `.html`은 브라우저로 열면 바로 렌더. `.md`는 GitHub/VS Code/Obsidian에서 mermaid로 렌더되고, Excalidraw "Mermaid to Excalidraw"에 붙여넣어 가져올 수 있음.

## 인증·온보딩

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| LoginPage | `/login` | 없음 | [.md](./LoginPage.md) · [.html](./LoginPage.html) |
| AuthCallbackPage | `/auth/callback` | 없음 | [.md](./AuthCallbackPage.md) · [.html](./AuthCallbackPage.html) |
| OnboardingConsentPage | `/onboarding/consent` | 사용 | [.md](./OnboardingConsentPage.md) · [.html](./OnboardingConsentPage.html) |

## 메인 탭

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| MyWeddingPage | `/my-wedding` | 없음 | [.md](./MyWeddingPage.md) · [.html](./MyWeddingPage.html) |
| WeddingListPage | `/wedding-list` | 없음 | [.md](./WeddingListPage.md) · [.html](./WeddingListPage.html) |
| QrPage | `/qr` | 없음(스텁) | [.md](./QrPage.md) · [.html](./QrPage.html) |
| DmPage | `/dm` | 없음(스텁) | [.md](./DmPage.md) · [.html](./DmPage.html) |
| SettingsPage | `/settings` | 없음 | [.md](./SettingsPage.md) · [.html](./SettingsPage.html) |

## 청첩장 에디터

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| InvitationCreatePage | `/invitation/create` | 미사용(스테일) | [.md](./InvitationCreatePage.md) · [.html](./InvitationCreatePage.html) |
| InvitationEditPage | `/invitation/edit/:weddingId` | 미사용(스테일) | [.md](./InvitationEditPage.md) · [.html](./InvitationEditPage.html) |

## 라운지

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| LoungeCheckInGatePage | `/lounge/:loungeId/enter` | 사용 | [.md](./LoungeCheckInGatePage.md) · [.html](./LoungeCheckInGatePage.html) |
| LoungeFeedPage | `/lounge/:loungeId` | 사용(피드) | [.md](./LoungeFeedPage.md) · [.html](./LoungeFeedPage.html) |
| LoungeV2Page | `/lounge/:loungeId/v2` | 사용(피드·Feed 동형) | [.md](./LoungeV2Page.md) · [.html](./LoungeV2Page.html) |
| SharePhotoUploadPage | `/lounge/:loungeId/share-photos/upload` | 사용(actor) | [.md](./SharePhotoUploadPage.md) · [.html](./SharePhotoUploadPage.html) |

## 웨딩 상세

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| LedgerPage | `/wedding/:weddingId/report` | 없음 | [.md](./LedgerPage.md) · [.html](./LedgerPage.html) |
| WeddingMemoryBookPage | `/wedding/:weddingId/memory-book` | 없음 | [.md](./WeddingMemoryBookPage.md) · [.html](./WeddingMemoryBookPage.html) |
| WeddingMemoryBookCuratePage | `/wedding/:weddingId/memory-book/curate` | 없음 | [.md](./WeddingMemoryBookCuratePage.md) · [.html](./WeddingMemoryBookCuratePage.html) |

## 초대

| 페이지 | 라우트 | xstate 머신 | 파일 |
|---|---|---|---|
| HostInviteAcceptPage | `/invite/:token` | 없음 | [.md](./HostInviteAcceptPage.md) · [.html](./HostInviteAcceptPage.html) |

