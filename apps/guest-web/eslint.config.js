import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import {
  projectStructureParser,
  projectStructurePlugin,
} from 'eslint-plugin-project-structure'
import { folderStructureConfig } from '../../folderStructure.mjs'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**'],
    ignores: ['projectStructure.cache.json'],
    languageOptions: { parser: projectStructureParser },
    plugins: { 'project-structure': projectStructurePlugin },
    rules: {
      'project-structure/folder-structure': ['error', folderStructureConfig],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 의도된 unused는 `_` prefix로 표현(destructuring rename, 함수 인자 placeholder 등).
      // 표준 컨벤션: argsIgnorePattern · varsIgnorePattern · caughtErrorsIgnorePattern.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // env 직접 참조 금지 (컨벤션: _code_convention/ENV_MANAGEMENT.md).
      // import.meta.env.VITE_* 만 차단. Vite 내장(.DEV/.MODE/.PROD/.SSR)은 selector 정규식으로 자연 제외.
      // env.ts 자체는 아래 override 로 예외 처리.
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
