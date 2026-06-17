# 백엔드 테스트 컨벤션

Go 백엔드 테스트의 디테일. 원칙·매트릭스는 `TESTING.md` 참조.

## 파일 네이밍

| 대상 | 파일명 | 위치 |
|------|--------|------|
| 핸들러 테스트 | `handler_{리소스}_test.go` | `apps/api/server/` |
| 서비스 테스트 | `service_{리소스}_test.go` | `apps/api/server/` |
| 인프라 테스트 | `{파일명}_test.go` | 해당 파일과 같은 디렉토리 |
| 공통 헬퍼 | `testhelpers_{영역}_test.go` | `apps/api/server/` |

> `_test.go` 접미사를 붙여 프로덕션 빌드에서 자동 격리한다. 같은 패키지의 다른 `*_test.go`에서는 export 여부와 관계없이 자유롭게 호출 가능.

## TDD 사이클

CLAUDE.md §2-2-1에 따라 service·handler 구현 전 `_test.go`를 먼저 작성하고 red → green 사이클로 진행한다.

### 빠른 사이클 — 핸들러 단위 테스트 (mock service, DB 불필요)

서비스 인터페이스를 mock하여 핸들러의 HTTP 플러밍을 검증한다.

```go
mockSvc := &mockUserService{
    GetByIDFn: func(ctx context.Context, id pgtype.UUID) (*User, error) {
        return &User{Name: "박태원"}, nil
    },
}
srv := NewServer(mockSvc, nil, nil)
ctx := WithUserContext(context.Background(), testUUID)
resp, _ := srv.GetMe(ctx, GetMeRequestObject{})
assert.IsType(t, GetMe200JSONResponse{}, resp)
```

- 테스트 대상: 인증 확인, 에러→상태 코드 매핑, 응답 타입 변환
- 실행 속도: 밀리초 단위. red-green-refactor 사이클에 적합.

### 느린 사이클 — 서비스 통합 테스트 (로컬 DB 필요)

서비스 구현이 실제 DB와 올바르게 동작하는지 검증한다.

```go
svc := NewWeddingService(testPool)
wedding, err := svc.Create(ctx, testUserID, &CreateWeddingRequest{...})
assert.NoError(t, err)
assert.Equal(t, "active", string(wedding.Status))
```

- 테스트 대상: 트랜잭션, SQL 정합성, 데이터 변환.
- 각 테스트 전 관련 테이블 truncate로 격리.

### 순수 함수 단위

- 변환 헬퍼: `textFromPtr`, `accountToJSON`, `uuidToOpenapi` 등.
- 인증 미들웨어: 유효한 JWT, 만료된 JWT, 토큰 없음 등.

## 인증 헬퍼 (testhelpers_auth.go)

P3에서 추출. `apps/api/server/testhelpers_auth.go`에 export:

| 함수 | 용도 |
|------|------|
| `NewFakeGoTrueServer(uid, email, name string) *httptest.Server` | GoTrue 응답을 흉내내는 mock 서버. `AuthMiddleware`의 토큰 검증 우회용. |
| `WithUserContext(ctx context.Context, userID pgtype.UUID) context.Context` | userID를 context에 박아 핸들러가 `UserIDFromContext`로 꺼낼 수 있게 함. |
| `ctxWithUser(userID pgtype.UUID) context.Context` | `WithUserContext(context.Background(), userID)`의 단축. handler-level 테스트에서 부모 context가 필요 없을 때 사용. |
| `NoopEnsureUser EnsureUserFunc` | JIT 프로비저닝 ensure 콜백의 no-op 구현. 호출 횟수 추적이 필요하면 테스트에서 직접 구현. |

### 사용 예 (핸들러 통합)

```go
ts := NewFakeGoTrueServer(testUID, "test@example.com", "Test")
defer ts.Close()
h := AuthMiddleware(ts.URL, "anon", NoopEnsureUser)(myHandler)

req := httptest.NewRequest("GET", "/me", nil)
req.Header.Set("Authorization", "Bearer dummy")
rec := httptest.NewRecorder()
h.ServeHTTP(rec, req)
assert.Equal(t, 200, rec.Code)
```

### 시드 유저로 통합 테스트 (선택)

E2E 외에 통합 단계에서도 실제 시드 유저 JWT를 받아 핸들러에 주입할 수 있다 — 인증 흐름 자체를 백엔드 단에서 검증하고 싶을 때만:

```go
token := signInWithPassword(t, "test-host@example.com", os.Getenv("E2E_TEST_HOST_PASSWORD"))
req.Header.Set("Authorization", "Bearer "+token)
```

단, **RLS 정책 자체 검증은 E2E에서 한다** (TESTING.md 결정-3).

## DB 전략

- 로컬 Supabase (`127.0.0.1:54322`, OrbStack). `supabase start` 부팅 + `supabase db reset` 적용 상태 전제.
- 각 테스트 전 관련 테이블 `TRUNCATE ... CASCADE`로 격리.
- testify (`assert`, `require`)로 assertion.

```go
func setupDB(t *testing.T) *pgxpool.Pool {
    pool := newTestPool(t)
    t.Cleanup(func() { pool.Close() })
    _, err := pool.Exec(context.Background(),
        "TRUNCATE TABLE v3_weddings, v3_wedding_members CASCADE")
    require.NoError(t, err)
    return pool
}
```

## Table-driven 컨벤션

기존 17개 `_test.go` 패턴을 따른다. 케이스가 3개 이상이면 table-driven으로:

```go
tests := []struct {
    name    string
    input   string
    want    string
    wantErr bool
}{
    {"empty", "", "", true},
    {"valid", "abc", "ABC", false},
    {"unicode", "한글", "한글", false},
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got, err := MyFunc(tt.input)
        if tt.wantErr {
            assert.Error(t, err)
            return
        }
        assert.NoError(t, err)
        assert.Equal(t, tt.want, got)
    })
}
```

## 실행 옵션

| 명령 | 용도 |
|------|------|
| `go test ./...` | 빠른 회귀 |
| `go test ./... -race -count=1` | **기본 검증 게이트.** race detector + 캐시 무효화 |
| `go test ./... -coverprofile=cover.out` | coverage 측정 |
| `go tool cover -func=cover.out` | 함수별 coverage 출력 |

- **목표 coverage** (참고 — 강제 아님): handler 80%+, service 70%+, 인프라 60%+. 의미 있는 케이스 우선.
- **CI에서**: `-race -count=1` 필수. 캐시 우회로 결정성 보장.

## 테스트하지 않는 것

| 대상 | 이유 |
|------|------|
| sqlc 생성 코드 자체 | 서비스 통합 테스트에서 자연스럽게 검증됨 |
| HTTP 라우팅 | oapi-codegen이 보장 |
| `*.gen.go` | 생성 코드는 생성 도구의 책임 |
| RLS 정책 자체 | 백엔드는 service_role로 접근 — RLS 검증은 E2E |
