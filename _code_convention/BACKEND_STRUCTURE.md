# 백엔드 폴더 구조 컨벤션

## 원칙

생성 코드와 구현 코드를 같은 패키지에 두되, 파일 네이밍으로 구분한다.

## 아키텍처

```
HTTP 요청 → handler → service (interface) → sqlc → DB
```

- **handler**: HTTP 요청 파싱, 인증 확인, 서비스 호출, 에러→HTTP 상태 코드 매핑, 응답 포맷팅
- **service**: 비즈니스 로직 (트랜잭션, 검증, 데이터 변환). 인터페이스로 정의되어 mock 가능
- **sqlc**: SQL 쿼리 → 타입 안전 Go 코드 자동 생성

## 폴더 구조

```
apps/api/
├── main.go                          ← 서버 시작, 서비스 생성, 라우터 등록
├── oapi-codegen-models.yaml         ← codegen config (모델)
├── oapi-codegen-server.yaml         ← codegen config (서버 인터페이스 + 라우터)
├── server/
│   ├── *.gen.go                     ← 생성 코드 (직접 수정 금지)
│   ├── server.go                    ← Server struct (서비스 인터페이스 의존) + 생성자
│   ├── service.go                   ← 서비스 인터페이스 정의 + 도메인 에러
│   ├── service_{리소스}.go           ← 서비스 구현 (비즈니스 로직 + DB 호출)
│   ├── handler_{리소스}.go           ← thin handler (HTTP 플러밍만)
│   ├── auth.go                      ← JWT 인증 미들웨어
└── uploads/                         ← 업로드된 파일 저장 디렉토리
```

## 파일 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| codegen 생성 | `*.gen.go` | `models.gen.go`, `server.gen.go` |
| 서비스 인터페이스 | `service.go` | 모든 인터페이스 + 도메인 에러를 한 파일에 |
| 서비스 구현 | `service_{리소스}.go` | `service_users.go`, `service_weddings.go` |
| 핸들러 구현 | `handler_{리소스}.go` | `handler_weddings.go` |
| 구현체/인프라 | 역할 이름 | `server.go`, `auth.go` |

## codegen 규칙

- `*.gen.go` 파일은 직접 수정하지 않는다. `pnpm --filter @gorae/contracts generate:go`로 재생성.
- 모델과 서버를 별도 config로 분리 생성:
  - `oapi-codegen-models.yaml` → `server/models.gen.go`
  - `oapi-codegen-server.yaml` → `server/server.gen.go`
- 파일 업로드는 presigned 전용(`POST /uploads/presigned`) — 구 multipart `POST /uploads` 수동 핸들러는 2026-06-10 스토리지 일관화로 폐기 (_code_convention/STORAGE.md).

## DB 쿼리 작성 규칙

- **jsonb 컬럼 UPDATE 는 `COALESCE(convert_from(sqlc.narg('x'), 'UTF8')::jsonb, col)` 패턴 필수.** `DATABASE_URL` 에 `default_query_exec_mode=simple_protocol` 이 켜져 있어 pgx 가 `[]byte` 를 bytea hex 로 보냄 → `::jsonb` 캐스트만으론 22P02 (invalid input syntax for type json) 로 깨짐. 근거: commit `489b2ab`.

## 서비스 레이어 패턴

### 인터페이스 정의 (service.go)

```go
type UserService interface {
    GetByID(ctx context.Context, id pgtype.UUID) (*User, error)
    Update(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error)
}
```

- 서비스 인터페이스는 oapi-codegen 모델 타입을 사용 (같은 패키지)
- HTTP 전용 타입 (RequestObject, ResponseObject)은 사용하지 않음
- 도메인 에러 (`ErrNotFound`, `ErrSlugConflict`)를 반환. 핸들러가 HTTP 상태 코드로 매핑

### 서비스 구현 (service_{리소스}.go)

```go
type userService struct {
    pool *pgxpool.Pool
}

func NewUserService(pool *pgxpool.Pool) UserService {
    return &userService{pool: pool}
}
```

- `*pgxpool.Pool`을 주입받아 sqlc Queries를 생성
- 트랜잭션이 필요하면 `pool.Begin()` 사용
- DB 에러를 도메인 에러로 변환 (예: `pgx.ErrNoRows` → `ErrNotFound`)

### 핸들러 패턴 (handler_{리소스}.go)

```go
func (s *Server) GetMe(ctx context.Context, req GetMeRequestObject) (GetMeResponseObject, error) {
    userID, ok := UserIDFromContext(ctx)
    if !ok {
        return GetMe401JSONResponse{...}, nil
    }

    user, err := s.Users.GetByID(ctx, userID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return GetMe401JSONResponse{...}, nil
        }
        return nil, err
    }

    return GetMe200JSONResponse(*user), nil
}
```

- 핸들러는 thin wrapper: 인증 확인 → 서비스 호출 → 에러 매핑 → 응답 반환
- 비즈니스 로직은 서비스에, DB 호출은 서비스에, 타입 변환은 서비스에
- 핸들러에 남는 것: context에서 userID 추출, 도메인 에러 → HTTP 응답 변환

## 테스트

테스트 컨벤션은 [BACKEND_TESTING.md](./BACKEND_TESTING.md) 참조.
