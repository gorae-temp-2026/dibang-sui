# Admin Page — `apps/admin` 시나리오

> 운영자 1명(`admin@gorae.dev`)이 dev/prod 2개 환경의 v3 데이터를 한 페이지에서 read-only로 조회하는 admin 페이지. (LOCAL은 2026-05-25 사용자 결정으로 제외 — 브라우저 admin이 supabase-js로 붙으려면 로컬 Supabase stack 필요한데 도입 안 함)
>
> 작성: 2026-05-25 — `/scenario` 인터뷰
>
> 이식 참고: `../web-mobile-application/apps/admin` (v2 admin)의 DashboardPage / WeddingsPage / WeddingDetailPage 패턴 박제. 단 수정/삭제 일체 제외, v3 테이블만 조회.

## 0. 전제 / 제약

| 항목 | 결정 |
|---|---|
| **위치** | `apps/admin/` (모노레포 신규 앱) |
| **배포** | 안 함. 로컬 실행만 (`pnpm dev` 등) |
| **인증** | Email + Password. `admin@gorae.dev` 단일 계정. Supabase Dashboard에서 사용자 본인이 사전 생성 (코드에 비번 미포함) |
| **데이터 범위** | **v3 테이블만**. legacy 21테이블 미표시 |
| **권한** | **read-only**. 수정·삭제·생성 일체 없음. 향후 별도 시나리오로 분리 가능 |
| **환경 토글** | 헤더 드롭다운으로 DEV / PROD 전환. Supabase 클라이언트 swap + react-query invalidate. 같은 URL에서 환경만 바뀜 |
| **환경 키 관리** | `apps/admin/.env`에 2세트 (`VITE_DEV_SUPABASE_URL/_ANON_KEY` + `VITE_PROD_*`). git ignore. 드롭다운 선택 시 대응 키 사용 |
| **MVP 범위** | 본 문서 S-01 ~ S-05. Display 연결 상태·데이터 헬스체크·유저관리·약관·감사로그는 향후 별도 시나리오 |

## 1. Navigation 구조

```
┌──────────────────────────────────────────────────────────┐
│ 로고  │  [환경 ▾ DEV/PROD]  │  admin@gorae.dev  │ 로그아웃 │  ← 헤더 (모든 페이지 고정)
├──────────────────────────────────────────────────────────┤
│ 사이드바 또는 상단 탭                                       │
│  · 대시보드  · 웨딩 목록                                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 본문                                                       │
│  /dashboard          (S-03)                              │
│  /weddings           (S-04)                              │
│  /weddings/:id       (S-05)                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 2. 시나리오 테이블

| # | Actor | Screen | Action | Result | Data Flow | Edge Case | Permission |
|---|---|---|---|---|---|---|---|
| **S-01** | admin | `/login` | Email + Password 입력 → 제출 | 인증 성공 → `/dashboard` 리다이렉트 | Supabase Auth `signInWithPassword` | 비번 틀림/형식 오류 → 에러 토스트. `admin@gorae.dev`가 아닌 이메일은 인증돼도 즉시 로그아웃 + 거부 메시지 | `admin@gorae.dev` 전용 (가드는 클라이언트 + Supabase RLS 양쪽) |
| **S-02** | 로그인된 admin | 모든 페이지 상단 헤더 | 환경 드롭다운 (DEV/PROD) 선택 | 선택 환경 데이터로 즉시 화면 갱신 | 1) supabase client 인스턴스 swap (선택된 환경의 URL/key). 2) react-query 전체 invalidate. 3) URL은 변경 없음. 4) 현재 환경은 sessionStorage로 보존 | 선택 환경 미접속(키 미설정 등) → AdminGuard에서 "환경 미구성" 안내 | 본인만 |
| **S-03** | admin | `/dashboard` | 진입 | v2 박제 통계 카드 표시 (오늘 4개 + 전체 2개) | 선택 환경 v3 테이블 집계 쿼리 (KST 기준 today) | 데이터 0건 → "0" 표시. fetch 에러 → 에러 메시지 + 재시도 버튼. 로딩 → 스켈레톤 6개 | read-only |
| **S-04** | admin | `/weddings` | 진입 | 모든 v3 wedding 카드 또는 표 형태 목록 | `v3_weddings` SELECT 전체 (`status != 'deleted'`, `ORDER BY created_at DESC`). 페이지네이션 없음 (전체 로드) | 0건 → 빈 상태 메시지. 클릭 → S-05로 이동 | read-only |
| **S-05** | admin | `/weddings/:weddingId` | 웨딩 카드 클릭 | 그 wedding의 v3 데이터를 섹션별로 한 화면에 표시 (11 테이블) | `v3_weddings`(상세) + 11 테이블 wedding_id로 JOIN. 각 섹션은 collapse 가능 권장 | 섹션별 0건 → 빈 표시. wedding_id 없음 → 404 | read-only |

### S-01 추가 칼럼

| 항목 | 내용 |
|---|---|
| Validation | email 형식, password 6자 이상 (Supabase 기본) |
| Navigation | 로그아웃 → `/login`. 비인증 상태로 다른 페이지 진입 시 → `/login` 리다이렉트 |
| Visual Feedback | 제출 중 버튼 스피너, 에러 토스트 (상단) |

### S-02 추가 칼럼

| 항목 | 내용 |
|---|---|
| Realtime | 폴링/소켓 없음. 환경 전환 시 1회 refetch |
| Cross-Device | 데스크톱 위주. 모바일 미지원 (admin은 데스크톱 운영) |

### S-03 통계 지표 (v2 패턴 박제 → v3 매핑)

| 카드 | 라벨 | 쿼리 |
|---|---|---|
| 오늘 1 | 오늘의 웨딩 | `SELECT COUNT(*) FROM v3_weddings WHERE date = todayStr AND status != 'deleted'` |
| 오늘 2 | 오늘 축의금 건수 | `SELECT COUNT(*) FROM v3_cash_gifts WHERE created_at >= todayStart AND created_at < tomorrowStart` |
| 오늘 3 | 오늘 축의금 총액 | `SELECT SUM(amount) FROM v3_cash_gifts WHERE created_at today` |
| 오늘 4 | 오늘 신규 가입 | `SELECT COUNT(*) FROM v3_users WHERE created_at today AND id != '00000000-0000-0000-0000-000000000001'` (placeholder 제외) |
| 전체 1 | 전체 유저 | `SELECT COUNT(*) FROM v3_users WHERE id != '00000000-0000-0000-0000-000000000001'` |
| 전체 2 | 전체 웨딩 | `SELECT COUNT(*) FROM v3_weddings WHERE status != 'deleted'` |

KST(UTC+9) 기준 today 경계:
```ts
const kstNow = new Date(Date.now() + 9 * 3600 * 1000)
const todayStr = kstNow.toISOString().slice(0, 10) // 'YYYY-MM-DD'
const todayStart = new Date(`${todayStr}T00:00:00+09:00`).toISOString()
const tomorrowStart = new Date(new Date(`${todayStr}T00:00:00+09:00`).getTime() + 86400000).toISOString()
```

### S-04 추가 칼럼

| 항목 | 내용 |
|---|---|
| Sort | `created_at DESC` 고정 (MVP) |
| Filter | 없음 (MVP). 추후 wedding name 검색·status 필터 가능 |
| Pagination | **없음. 전체 로드** (prod 19개, 천 단위 되면 재검토) |
| Visual Feedback | 로딩 → 스켈레톤. 빈 상태 → "등록된 웨딩이 없습니다" |

### S-05 표시 범위 (11 테이블)

| # | v3 테이블 | 섹션 라벨 | 표시 내용 |
|---|---|---|---|
| 1 | `v3_weddings` | 웨딩 기본 정보 | 신랑·신부 이름, 부모 이름, 식일·시간·장소, status, host 6슬롯, 계좌 6슬롯 (jsonb) |
| 2 | `v3_wedding_lounges` | 라운지 | lounge name, id |
| 3 | `v3_mobile_invitations` | 청첩장 | design_template_id, cover_image, gallery_photos(jsonb 배열 수), visited_count, heart_count, slug |
| 4 | `v3_lounge_entries` | 입장자 (66) | user_id, visitor_name, recipient_slot, relation_category/detail, created_at — 표 |
| 5 | `v3_guestbook_entries` | 방명록 | guest_name, recipient_slot, relation_category/detail, message, created_at — 표 |
| 6 | `v3_guestbook_messages` | 라운지 메시지 | message (`__HEART__` 별도 표시), guestbook_entry_id, created_at |
| 7 | `v3_cash_gifts` | 축의금 | guest_name, recipient_slot, amount, pay_method, guestbook_entry_id, created_at + 총액 |
| 8 | `v3_shared_photos` | 공유사진 | guest_user_id, storage_path, file_name, created_at + 썸네일 그리드 |
| 9 | `v3_memories` | 메모리 | author_user_id, text, photo_url, created_at |
| 10 | `v3_memory_book_photos` | 메모리북 큐레이션 | photo_id, display_order, selected_by, created_at |
| 11 | `v3_host_invites` | 호스트 초대 | slot, status, token, invited_user_id, accepted_at, created_at |

각 섹션 권장 UX:
- 헤더에 행수 표시 (예: "방명록 (12건)")
- 0건이면 빈 메시지 ("등록된 방명록 없음")
- 표는 가로 스크롤 가능 (컬럼 많음)
- collapse/expand 가능 (긴 페이지 가독성)

## 3. 기술 스택 (제안, 구현 시 확정)

- Frontend: Vite + React (기존 apps/dibang-wedding와 동일 컨벤션)
- 상태관리: 단순. xState 미사용 (페이지 단위 비동기 분기 2개 미만)
- 데이터: `@supabase/supabase-js` 직접 + TanStack React Query
- 스타일: Tailwind CSS (기존 컨벤션)
- 라우팅: react-router
- 인증 가드: `<AdminGuard>` 컴포넌트 (auth.users.email !== 'admin@gorae.dev' → 거부)

## 4. 향후 별도 시나리오 후보 (MVP 밖)

- 유저 관리 (`v3_users` 목록/상세, 소프트 삭제, 권한 변경)
- 약관 관리
- 감사 로그 (admin 동작 트래킹)
- 데이터 헬스체크 (v2 패턴: 축의금 금액 정합성, 호스트 미등록 wedding 등)
- 실시간 활성도 모니터링
- 수정/삭제 권한 (호스트 대신 정정)
- 환경 간 데이터 비교 (예: dev vs prod diff)
