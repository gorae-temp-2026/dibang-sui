# 웨딩메모리북 UI 이식 (v2 → v3 dibang-wedding)

> v2 `web-mobile-application/apps/web-app/src/pages/host/memorybook/`의 UI를 v3 dibang-wedding에 이식.
> 백엔드는 이미 v3 contract로 구축됨 (`_scenario/wedding-memorybook-2026-05-24/SCENARIOS.md` 참조).
> 시나리오 작성일: 2026-05-24

## 0. 배경 / 결정사항

### 0-1. v2 UI 자산 (이식 대상)
| 파일 | 역할 |
|---|---|
| `MemoryBookCuratePage.tsx` | 사진 그리드 + 토글 + 라이트박스(embla) + 저장 |
| `WeddingMemoryBookPage.tsx` | status 분기 + viewer 라우팅 |
| `v2.4_final/MemoryBookV2_4.tsx` | 메모리북 viewer (커플 + 사진 + 메시지 책자) |
| `MyWeddingPage.tsx`의 `MemoryBookBanner` | 호스트 홈 진입 카드 (카운트다운 포함) |
| 보조 컴포넌트 | StackHeader, Spinner, PhotoGridItem, SelectionDot, PhotoLightbox, LightboxArrow |
| 정적 자산 | `/WeddingMemoryBook.svg`, theme.ts(colors/fonts) |

### 0-2. v2 → v3 컨벤션 매핑
| v2 | v3 |
|---|---|
| 인라인 `style={{}}` + colors/fonts 토큰 | **Tailwind 전면** (v2 토큰 → v3 토큰 매핑) |
| SWR + `useSWRAuth` + `globalMutate` | **TanStack React Query** + `@gorae/contracts/@tanstack/react-query.gen` SDK |
| 라우트 `/host/memorybook?id=...` + `/host/:weddingId/memorybook/curate` | **`/wedding/:weddingId/memory-book`** (viewer) + **`/wedding/:weddingId/memory-book/curate`** (큐레이션) — v3 REST 정렬 |
| `useState` curate flow | `useState` 유지 (단일 API + 로컬 분기라 XState 불필요) |
| status 3분기 (not_ready/ready_uncurated/ready) | **2분기 (ready_uncurated/ready)**. NotReadyBanner·`computeMemoryBookDeadline` **제거** |

### 0-3. 확정 결정사항
- **진입점**: MyWeddingPage 결혼식 카드 **하단 단축 버튼 하나**. v2의 큰 MemoryBookBanner는 가져오지 않음 (이용가능시점 게이트 제거됨)
- **Viewer**: MemoryBookV2_4 **100% 동일 포팅**. 섹션 구조·레이아웃·서체 비례 그대로
- **NotReadyBanner**: **제거** — dead code 안 남김. v2의 `MemoryBookBanner` 카운트다운 로직(`computeMemoryBookDeadline`)도 함께 제외
- **신규 의존성**: `embla-carousel-react` (라이트박스용)
- **정적 자산**: `/WeddingMemoryBook.svg` 등 v2 public 자산 같이 이식

---

## 1. A. 진입점

| # | Actor | Screen | Action | Result | Data Flow | Navigation | Edge Case |
|---|---|---|---|---|---|---|---|
| S-01 | Host | dibang `/my-wedding` | 결혼식 카드 하단 "웨딩메모리북" 단축 버튼 탭 | viewer 페이지로 이동 | — | → `/wedding/:weddingId/memory-book` | 버튼은 호스트 모든 상태에서 항상 노출 (이용가능시점 게이트 없음) |

## 2. B. 큐레이션 (Host가 사진 30장 선택)

| # | Actor | Screen | Action | Result | Data Flow | State Change | Validation | Edge Case |
|---|---|---|---|---|---|---|---|---|
| S-02 | Host | `/wedding/:weddingId/memory-book/curate` | 페이지 진입 | shared 그룹별 그리드(이름·누구측·관계 라벨 포함) + 기존 큐레이션 선택 복원 + 상단 "선택한 사진 N/30" 미니 그리드 | `useQuery(getWeddingMemoryBookOptions)` + `useQuery(getWeddingSharedPhotoGroupsOptions)` (백엔드 신규 `GET /weddings/{id}/shared-photo-groups`) | — | — | shared 0건 → "아직 공유된 사진이 없어요" 빈 상태 |
| S-03 | Host | 사진 본체 클릭 | embla 라이트박스 열림 — 좌우 스와이프, 키보드 화살표/Esc, 우상단 동그라미로 선택 토글 | 클라이언트 state(lightboxIndex) | — | — | 양 끝 사진 다음 스와이프 차단, Esc 닫기 |
| S-04 | Host | 동그라미 클릭(그리드 or 라이트박스) | 토글 + 선택 순번(1,2,3…) 표시 | 클라이언트 state(selectedIds) | — | **max 30**, 31번째 토글은 배열 push 안 함 | — |
| S-05 | Host | 하단 "저장하기 (N장)" 1장↑ | mutation → 성공 시 viewer로 이동(`/wedding/:weddingId/memory-book`) + "저장되었습니다!" 토스트 | `useMutation(replaceWeddingMemoryBookPhotosMutation)` + `invalidateQueries(getWeddingMemoryBookQueryKey)` | `v3_memory_book_photos` 전체 교체 (RPC `v3_upsert_memory_book_photos`) | photo_ids ≤30, 중복 금지 | 400 invalid_ids → 에러 박스, 500 → 에러 박스, 네트워크 끊김 → 에러 박스 |
| S-06 | Host | 하단 "저장하기" 0장 | `confirm("선택된 사진이 없습니다. 마치고 나가시겠습니까?")` → 확인 시 빈 배열 PUT → 호스트 홈(`/my-wedding`) 이동 | 동일 (photo_ids: []) | 모든 큐레이션 row DELETE → status `ready_uncurated` | — | confirm 취소 → 페이지 잔류 |

## 3. C. Viewer (status: ready)

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|---|---|---|---|---|---|
| S-07 | Host | `/wedding/:weddingId/memory-book` | 페이지 진입 | status=`ready` → `MemoryBookV2_4` 렌더, status=`ready_uncurated` → `/curate`로 redirect (replace) | `useQuery(getWeddingMemoryBookOptions)` | 로딩 중 → Spinner, 데이터 없음 → 에러 메시지 |
| S-08 | Host | viewer 본문 | v2 `MemoryBookV2_4` 디자인 **100% 동일** — 커플 표지 + 큐레이션 사진 섹션 + display(모청) 사진 섹션 + 자동선별 메시지 책자 + 통계 카드 | 정적 렌더 (props로 `MemoryBookData` 전달) | curated 0건/display 0건/메시지 0건 → 각 섹션 빈 상태 처리 (v2 동작 유지) |

## 4. D. 작업 명세

| # | 레이어 | 작업 |
|---|---|---|
| S-09 | **라우트** | dibang `App.tsx`에 viewer + curate 2개 라우트 등록 (AuthGuard 안). 기존 `/wedding/:weddingId/report` 패턴과 결 맞춤 |
| S-10 | **페칭** | `@gorae/contracts/@tanstack/react-query.gen`의 `getWeddingMemoryBookOptions`, `replaceWeddingMemoryBookPhotosMutation` 사용. shared 사진 그룹 API는 v3에 이미 있는 것 활용 (구현 시 `handler_shared_photos.go` 매칭 확인) |
| S-11 | **스타일** | Tailwind 전면. v2 colors(bgWarm/brand/textPrimary/borderWarm/error/success 등) → v3 토큰. 픽셀 단위는 Tailwind spacing/font-size 스케일로 매핑 (가능한 1:1, 어긋나는 건 가장 가까운 값) |
| S-12 | **state** | curate: `useState`(selectedIds: string[], lightboxIndex: number\|null, saveError, saveSuccess) + RQ. 단일 API + 로컬 분기라 XState 불필요 |
| S-13 | **의존성 설치** | `pnpm --filter dibang-wedding add embla-carousel-react` |
| S-14 | **진입점** | MyWeddingPage 결혼식 카드 하단에 텍스트 버튼 하나 (`navigate('/wedding/${id}/memory-book')`) |
| S-15 | **정적 자산** | v2 `apps/web-app/public/WeddingMemoryBook.svg` 등 메모리북 전용 정적 파일을 dibang-wedding `public/`으로 복사 |
| S-16 | **컴포넌트 이식 리스트** | StackHeader (이미 있을 수도, 확인), Spinner (이미 있음), PhotoGridItem, SelectionDot, PhotoLightbox, LightboxArrow, MemoryBookV2_4 본체 + 그 안 하위 섹션 컴포넌트 |
| S-17 | **e2e 검증** | Playwright로 호스트 로그인 → 진입 버튼 클릭 → 큐레이션 페이지 → 사진 3장 선택 → 저장 → viewer 진입 → 큐레이션 사진 표시 확인 |

---

## 5. v2 참조 위치

- `web-mobile-application/apps/web-app/src/pages/host/memorybook/MemoryBookCuratePage.tsx`
- `web-mobile-application/apps/web-app/src/pages/host/memorybook/WeddingMemoryBookPage.tsx`
- `web-mobile-application/apps/web-app/src/pages/host/memorybook/v2.4_final/MemoryBookV2_4.tsx`
- `web-mobile-application/apps/web-app/src/pages/MyWeddingPage.tsx` (MemoryBookBanner, computeMemoryBookDeadline — UI만 참조, 카운트다운 로직은 제외)
- `web-mobile-application/apps/web-app/src/lib/theme.ts` (colors/fonts 토큰 — v3 토큰 매핑 시 참조)
- `web-mobile-application/apps/web-app/src/components/StackHeader.tsx`, `Spinner.tsx`
- `web-mobile-application/apps/web-app/public/WeddingMemoryBook.svg`

## 6. 백엔드 (이미 구축됨)

- API: `GET /weddings/{weddingId}/memory-book`, `PUT /weddings/{weddingId}/memory-book/photos`
- RPC: `public.v3_upsert_memory_book_photos(uuid, uuid[], uuid)` (v2 잔재와 충돌 회피 위해 v3_ prefix)
- 시나리오: `_scenario/wedding-memorybook-2026-05-24/SCENARIOS.md`
