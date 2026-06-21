// 환경변수 스키마 — 부팅 시점 검증의 SSOT.
// 컨벤션: _code_convention/ENV_MANAGEMENT.md
//
// 사용 규칙:
//   - 본 모듈의 `env` 객체로만 환경변수 접근. `import.meta.env.*` 직접 참조 금지.
//   - 새 키 추가 시 (a) .env.example (b) 본 스키마 (c) 사용처 세 곳을 같이 갱신.
//   - import 자체로 검증이 트리거된다 (bootstrap.tsx 최상단에서 import).

import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    // Supabase (필수)
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),

    // 외부 URL (선택 — 미설정 시 코드 측 fallback)
    VITE_BASE_URL: z.string().url().optional(),
    VITE_DIBANG_URL: z.string().url().optional(),

    // Go API base URL. @gorae/contracts 런타임(runtime/hey-api.ts)이 직접 읽는다.
    // 미설정 시 codegen 기본값 http://localhost:8080. 멀티포트: LOCAL→8080 / DEV→8081 / PROD→8082.
    VITE_API_BASE_URL: z.string().url().optional(),

    // Sui 온체인 (선택 — 미설정 시 @gorae/sui-sdk의 testnet 기본값 사용)
    VITE_SUI_NETWORK: z.enum(['testnet', 'mainnet', 'devnet']).optional(),
    VITE_SUI_PACKAGE_ID: z.string().optional(),
    // [DEV] dev 지갑 직접 서명용 비밀키(헤드리스 검증 전용, prod 미설정).
    VITE_DEV_PRIVATE_KEY: z.string().optional(),
    // zkLogin / sponsor (선택 — 미설정 시 해당 기능 비활성)
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    VITE_SALT_SERVER_URL: z.string().url().optional(),
    VITE_ZK_PROVER_URL: z.string().url().optional(),
    VITE_ENOKI_API_KEY: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
