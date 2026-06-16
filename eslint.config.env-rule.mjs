// env 직접 참조 금지 룰만 검사하는 ESLint config (CI 차단 게이트 전용).
//
// 컨벤션: _code_convention/ENV_MANAGEMENT.md
//
// 사용:
//   pnpm exec eslint <path> --config eslint.config.env-rule.mjs --no-config-lookup
//
// 의도: 기존 누적 ESLint 결함(다른 룰들)은 영향 받지 않고, no-restricted-syntax 한 룰만으로
//       PR 을 차단한다. pr-checks.yml 의 frontend-lint-env-rule job 이 호출.

import tseslintParser from '@typescript-eslint/parser'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/projectStructure.cache.json']),
  {
    files: ['**/*.{ts,tsx}'],
    linterOptions: {
      // 단일 룰만 검사하므로 코드의 inline eslint-disable 주석을 무시한다.
      // 그렇지 않으면 disable 주석이 참조하는 룰(react-hooks 등)의 정의를 요구해 에러.
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.property.name='env'][object.object.type='MetaProperty'][property.name=/^VITE_/]",
          message:
            'import.meta.env.VITE_* 직접 참조 금지. src/env.ts 의 env 객체 사용. (컨벤션: _code_convention/ENV_MANAGEMENT.md)',
        },
      ],
    },
  },
  {
    // env.ts 는 t3-env createEnv 의 runtimeEnv 인자로 import.meta.env 를 통째로 넘기는 정석 경로.
    files: ['**/env.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
