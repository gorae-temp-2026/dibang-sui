# 환경변수 관리 컨벤션

이 문서는 디지털 방명록 v3 의 환경변수 관리 코드·운영 컨벤션 단일 진실원천이다.

---

## 0. 원칙

> **"실제 값은 git 밖, 키 카탈로그는 git 안."**

- `.env` 파일 = 실제 값. git ignore. 개발자·환경마다 다름.
- `.env.example` = 키 카탈로그. git 추적. **모든 키·기본값·필수 여부를 명시.**
- `env.ts` (FE) / `config.go` (BE) = 부팅 시점 검증 스키마. 누락·형식 오류 시 즉시 fail.
- 이 셋이 항상 동기화돼야 한다. 하나라도 어긋나면 빌드 또는 부팅에서 잡힌다.

---

## 1. FE 컨벤션

### 1-1. 라이브러리

| 도구 | 역할 |
| --- | --- |
| [`@t3-oss/env-core`](https://env.t3.gg) | Vite/Node용 env 스키마 빌더. 부팅 시점 검증 + 타입 추론. |
| [`zod`](https://zod.dev) | 스키마 정의. `@gorae/contracts` 와 동일 버전(v4.x) 사용. |

### 1-2. 파일 위치

```
apps/<app>/
├── .env.example   # 키 카탈로그 (git 추적)
├── .env           # 실제 값 (git ignore) — scripts/use-env.sh 로 환경 전환
└── src/env.ts     # 검증 스키마 (git 추적)
```

### 1-3. `src/env.ts` 작성 규칙

- 파일 머리에 컨벤션 참조 코멘트 + 사용 규칙 명시.
- `createEnv({ clientPrefix: 'VITE_', client: {...}, runtimeEnv: import.meta.env, emptyStringAsUndefined: true })` 형식.
- 키별 스키마:
  - URL은 `z.string().url()`
  - 비밀·일반 문자열은 `z.string().min(1)`
  - 선택 키는 위에 `.optional()` 추가 (코드 측에서 `??` fallback)
- 모든 키가 optional인 앱(admin 등)은 그렇게 그대로 작성. 형식 검증은 여전히 유효.

### 1-4. `bootstrap.tsx` (또는 `main.tsx`) 에서 검증 트리거

```ts
import './env'  // env 스키마 검증 — 부팅 시점에 누락·형식 오류 즉시 fail
import { StrictMode } from 'react'
// ...
```

- **`./env` import는 반드시 다른 어떤 import보다 먼저**. import 자체가 검증을 트리거한다.

### 1-5. 사용처에서의 참조

- **`import.meta.env.VITE_*` 직접 참조 금지.** 항상 `src/env.ts` 의 `env` 객체 경유.
- 예외: Vite 내장(`import.meta.env.DEV`, `.MODE`, `.PROD`, `.SSR`)은 그대로 사용 가능. t3-env 가 다루지 않음.
- 이름 충돌(예: admin 의 `useEnv` 훅)이 있는 모듈은 `import { env as appEnv } from '../env'` 로 별칭.

### 1-6. 환경 전환

- `scripts/use-env.sh local|dev|prod` 가 `.env` 심볼릭 링크를 `.env.local` / `.env.dev` / `.env.prod` 로 교체.
- 코드에서 환경 분기 금지(`if (import.meta.env.MODE === 'production') ...` 같은 분기). 환경 차이는 env 값 자체로 표현한다.

---

## 2. BE 컨벤션

### 2-1. 라이브러리

| 도구 | 역할 |
| --- | --- |
| [`github.com/kelseyhightower/envconfig`](https://github.com/kelseyhightower/envconfig) | Go 사실상 표준 env 로더. struct 태그로 `required` · `default` 선언. |
| [`github.com/joho/godotenv`](https://github.com/joho/godotenv) | `.env` 파일 로드 (기존 사용 유지). |

### 2-2. 파일 위치

```
apps/api/
├── .env.example           # 키 카탈로그 (server + 모든 cmd 도구 통합)
├── .env                   # 실제 값 (git ignore)
├── server/config.go       # 서버용 Config struct + LoadConfig()
├── server/config_test.go  # 필수/기본값/파싱 단위 테스트
└── cmd/<tool>/main.go     # cmd 도구별 자체 cmdConfig struct (부분집합)
```

### 2-3. `server/config.go` 작성 규칙

- 단일 `Config` struct가 서버 전역 env 카탈로그.
- envconfig 태그:
  - `required:"true"` — 미설정 시 `LoadConfig()` 에러
  - `default:"..."` — 미설정 시 기본값 적용 (기존 fallback 정책 보존용)
  - 둘 다 없으면 빈 문자열 허용 (코드 측에서 분기)
- 콤마 구분 등 가공이 필요한 키는 메서드로 노출 (`AdminEmails()`, `AllowedOriginsList()`, `IsLocalUpload()` 등).

### 2-4. `main.go` 에서 검증 트리거

```go
func main() {
    _ = godotenv.Load()
    cfg, err := api.LoadConfig()
    if err != nil {
        log.Fatalf("환경변수 검증 실패: %v", err)
    }
    // 이후 모든 env 접근은 cfg.* 경유
}
```

- **`os.Getenv` 직접 호출 금지.** 모든 env 접근은 Config struct 필드로.

### 2-5. cmd 도구

- 각 `cmd/<tool>/main.go` 는 자체 작은 `cmdConfig` struct 정의 (서버 Config 의 부분집합).
- 서버 Config 를 재사용하지 않는 이유: cmd 가 쓰지 않는 키(`SUPABASE_ANON_KEY` 등)의 required 검사를 받지 않기 위해.
- 같은 키는 같은 envconfig 태그(`required`/`default`) 사용해 일관성 유지.

### 2-6. 테스트

- `server/config_test.go` 는 다음 케이스를 최소 커버:
  1. 필수 키 누락 시 에러
  2. 모든 필수 키 설정 + default 적용 OK
  3. 콤마 구분 가공 메서드 동작 (`AdminEmails()` 등)
- 환경 격리: `t.Setenv("KEY", "")` 는 envconfig 에서 "값 있음"으로 처리되니 검증 불가. 필수 키 누락을 검증하려면 `os.Unsetenv` 사용 + `t.Cleanup` 으로 원복.

---

## 3. 운영 절차

### 3-1. 신규 env 키 추가

**같은 PR에서 세 곳을 함께 갱신한다. 셋 중 하나라도 빠지면 빌드 또는 부팅에서 fail.**

1. **`.env.example`** 에 키 추가 (코멘트로 환경별·기본값·필수 여부 명시)
2. **스키마**:
   - FE: `src/env.ts` 의 `client` 또는 `server` 항목에 추가
   - BE: `server/config.go` 의 `Config` struct에 필드 추가 (`envconfig` 태그 + `required`/`default`)
   - cmd 도구에서 쓰는 키면 해당 `cmdConfig` 에도 추가
3. **사용처에서 참조**:
   - FE: `env.VITE_*`
   - BE: `cfg.*`
4. **각 환경(.env, Render, Supabase 등)에 실제 값 설정**
5. **PR 리뷰 체크포인트**: diff 에 `.env.example` 변경이 함께 있는지 확인

### 3-2. env 키 삭제

1. **사용처 0건 확인** — `rg "ENV_KEY_NAME"` 로 코드 전체 검색
2. **스키마에서 제거** (env.ts / config.go)
3. **`.env.example` 에서 제거**
4. **외부 인프라 정리** — Render 콘솔 등에서 해당 env 항목 제거 (보안상 비밀 키는 즉시 회전)

### 3-3. 환경 전환

- 로컬 개발: `scripts/use-env.sh local|dev|prod` 로 `.env` 심볼릭 교체
- 배포(Render 등): 콘솔에 직접 설정. 이상적으로는 Render Blueprint(`render.yaml`)로 git 관리. (현재 미도입 — TODO)

---

## 4. 검증 게이트

### 4-0. lint 자동 강제 (1차 게이트, CI에서 PR 차단)

| 측 | 도구 / 룰 | 위치 |
| --- | --- | --- |
| FE | ESLint `no-restricted-syntax` — `import.meta.env.VITE_*` 직접 참조 차단 | 각 앱 `eslint.config.js` + 워크스페이스 루트 `eslint.config.env-rule.mjs` (CI 전용 단일 룰 config) |
| BE | golangci-lint `forbidigo` — `os.Getenv` 직접 호출 차단 | `apps/api/.golangci.yml` |
| CI | `frontend-lint-env-rule` job (FE, 차단 활성) · `go-lint` job (BE) | `.github/workflows/pr-checks.yml` |

예외:
- FE: `src/env.ts` 자체는 `import.meta.env` 를 `runtimeEnv` 인자로 통째로 넘기는 정석 경로 → `files: ['**/env.ts']` override 로 룰 OFF.
- FE: Vite 내장 `import.meta.env.DEV` / `.MODE` / `.PROD` / `.SSR` 는 selector 정규식 `/^VITE_/` 으로 자연 제외.
- BE: `_test.go` 파일은 `.golangci.yml` 의 `exclude-rules` 로 forbidigo 예외 (통합 테스트의 DATABASE_URL 직접 읽기 허용).

로컬 확인:
```bash
# FE 단일 룰만 검사 (env.config.env-rule.mjs)
pnpm exec eslint apps/guest-web/src apps/dibang-wedding/src apps/admin/src \
  --config eslint.config.env-rule.mjs --no-config-lookup --quiet

# BE
cd apps/api && golangci-lint run
```

룰 비활성화/우회 금지. inline `eslint-disable` / `//nolint:forbidigo` 같은 우회 주석으로 룰을 끄지 말 것.

### 4-1. `.env.example` ↔ 스키마 키 일치 (2차 게이트, 보조 grep)

lint 와 별개로 grep 으로도 즉시 검증할 수 있다 (CI 외부에서도 확인 가능).
스키마 자체가 코드 측 SSOT다. `.env.example` 과 diff 0건이어야 한다.

```bash
# FE: env.ts 스키마 ↔ .env.example
for app in guest-web dibang-wedding admin; do
  schema=$(rg -o 'VITE_[A-Z_][A-Z0-9_]*' apps/$app/src/env.ts | sort -u)
  envex=$(rg -o '^[A-Z_][A-Z0-9_]*=' apps/$app/.env.example | sed 's/=//' | sort -u)
  diff <(echo "$schema") <(echo "$envex") && echo "[$app] OK" || echo "[$app] DIFF"
done

# BE: server/config.go envconfig 태그 ↔ .env.example
config_keys=$(rg -o 'envconfig:"([A-Z_][A-Z0-9_]*)' -r '$1' apps/api/server/config.go | sort -u)
env_keys=$(rg -o '^[A-Z_][A-Z0-9_]*=' apps/api/.env.example | sed 's/=//' | sort -u)
diff <(echo "$config_keys") <(echo "$env_keys") && echo "[api] OK" || echo "[api] DIFF"
```

부가 검증: 직접 참조 잔존 확인 (Vite 내장 `.DEV`/`.MODE` 등 제외).

```bash
rg "import\.meta\.env\." apps/*/src | rg -v "(env\.ts|\.DEV\b|\.MODE\b|\.PROD\b|\.SSR\b)"  # FE
rg "os\.Getenv" apps/api/main.go apps/api/cmd/                                            # BE
```

둘 다 0건이어야 통과.

### 4-2. 부팅 fail 동작 확인

- **BE**: `cd /tmp && env -i PATH=/usr/bin <api-binary>` → `환경변수 검증 실패` 로 즉시 fatal
- **FE**: dev 서버 부팅 후 브라우저 콘솔에 `Invalid environment variables` 로 throw

---

## 5. 참고

- 모범 사례 `.env.example`: `apps/admin/.env.example` (코멘트·환경별 구분·시나리오 링크)
- 기술 스택 맵: `_architecture/tech-stack-map.html`
- 관련 컨벤션: `_code_convention/FRONTEND_STRUCTURE.md`, `_code_convention/BACKEND_STRUCTURE.md`
