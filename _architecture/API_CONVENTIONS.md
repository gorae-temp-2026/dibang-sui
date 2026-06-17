# API 설계 컨벤션

## 1. 복합 생성 API

`POST /weddings` 한 번에 Wedding + WeddingLounge + MoiGatherPlace + MobileInvitation 전부 생성.

- Wedding·WeddingLounge·MoiGatherPlace는 1:1, MobileInvitation은 1:N (복합 생성 시 1개 생성, 이후 추가 가능). 모두 Invariant에서 독립 존재 불가
- 서버에서 하나의 트랜잭션으로 처리
- 수정은 각각 분리 (PATCH /weddings/{id}, PATCH /weddings/{weddingId}/invitations/{invitationId} 등)

## 2. 접근 정책 (Authentication + Authorization)

모든 엔드포인트는 다음 4가지 접근 정책 중 하나를 가진다.

| 정책 | 인증 | 인가 | 의미 |
|------|------|------|------|
| `public` | 불필요 | 없음 | 누구나 접근 가능 |
| `authenticated` | 필수 | 없음 | 로그인하면 누구나. 리소스 소유권 검증 안 함 |
| `owner` | 필수 | 본인 확인 | JWT의 user_id와 리소스 소유자 일치 여부 검증 |
| `host` | 필수 | Host 확인 | JWT의 user_id가 해당 Wedding의 host 슬롯에 있는지 검증 |

OpenAPI spec 적용:
- `public` → `security: []` (글로벌 BearerAuth 해제)
- `authenticated`, `owner`, `host` → 글로벌 `security: [BearerAuth]` 적용
- `owner`, `host`의 인가 로직은 Go handler에서 구현 (spec에는 description으로 명시)

## 3. 이름 마스킹

모든 응답에서 타인의 이름은 **기본 마스킹**된다 (예: "김민태" → "김*태").
DB에는 항상 실명이 저장되며, API 서버가 응답 생성 시 조건을 판단하여 마스킹/실명을 분기한다.

### 해제 조건 (OR)

| 조건 | 설명 |
|------|------|
| 요청자가 해당 Wedding의 Host | host 슬롯에 있는 user_id |
| 요청자와 대상 간에 Ium 관계 존재 | v3_iums 테이블에서 from/to 양방향 조회 |

둘 중 하나라도 해당하면 실명, 아니면 마스킹.
비로그인 요청은 조건 확인 불가 → 항상 마스킹.

### 적용 대상

| 엔드포인트 | 마스킹 필드 |
|-----------|------------|
| `listGuestbookEntries` | `guest_name` |
| `listLoungeEntries` | `visitor_name` (응답에 포함) |
| `getMoi` | 소유자 이름 (Moi 응답에 포함) |
| `getUser` | `name` |

### 제외 (마스킹 안 함)

- WeddingInfo의 이름 (groom_name, bride_name, 부모 이름) — 청첩장에서 이미 public 공개
- 공지 작성자 Host 이름 — Host는 Wedding의 공인

## 4. Pagination

Cursor 기반. 파라미터: `cursor` (opaque string, 첫 요청 생략) + `limit` (기본 20, 최대 100).

```json
{
  "data": [],
  "next_cursor": "xxx",
  "has_more": true
}
```

## 5. 에러 응답

RFC 7807 (Problem Details).

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Wedding with ID xxx does not exist"
}
```

Validation 에러 시 `errors` 배열 확장:
```json
{
  "type": "about:blank",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request body validation failed",
  "errors": [
    { "field": "groom_name", "message": "required" }
  ]
}
```

## 6. URL 네이밍

| 규칙 | 적용 |
|------|------|
| 리소스명 | 복수형 (`/weddings`, `/lounges`, `/mois`) |
| 케이스 | kebab-case (`/gather-places`, `/moi-items`, `/interior-items`) |
| 중첩 깊이 | 최대 2단계 |
| ID 형식 | UUID |
| 소속 강한 하위 리소스 | 중첩 (`/lounges/{id}/guestbook`) |
| 독립 CRUD | 최상위 (`/interior-items/{id}`) |

## 7. Security Scheme

Supabase Auth JWT → Bearer 토큰.

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Go handler에서 JWT 검증 → `sub` 클레임으로 user_id 추출.
