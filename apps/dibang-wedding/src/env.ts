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
    // Supabase (배포 시 필수 — 로컬 trust-graph 등은 미설정 허용)
    VITE_SUPABASE_URL: z.string().url().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),

    // 외부 URL (선택 — 미설정 시 코드 측 fallback)
    VITE_API_BASE_URL: z.string().url().optional(),
    VITE_GUEST_WEB_URL: z.string().url().optional(),
    VITE_SITE_URL: z.string().url().optional(),

    // Sui 온체인 (선택 — 미설정 시 @gorae/sui-sdk testnet 기본값)
    VITE_SUI_NETWORK: z.enum(['testnet', 'mainnet', 'devnet']).optional(),
    VITE_SUI_PACKAGE_ID: z.string().optional(),
    VITE_SUI_ORIGINAL_PACKAGE_ID: z.string().optional(),
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    VITE_SALT_SERVER_URL: z.string().url().optional(),
    VITE_ZK_PROVER_URL: z.string().url().optional(),
    VITE_ENOKI_API_KEY: z.string().optional(),
    // [DEV] 헤드리스 테스트용 dev 지갑 비밀키(suiprivkey…). import.meta.env.DEV에서만 사용.
    VITE_DEV_PRIVATE_KEY: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
