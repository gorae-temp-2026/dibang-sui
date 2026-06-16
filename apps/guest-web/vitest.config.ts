import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 단위·통합 테스트 (Vitest + RTL + MSW). E2E(Playwright)와 분리.
// 컨벤션: _code_convention/FRONTEND_TESTING.md
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests-setup.ts'],
    css: false,
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', '.{idea,git,cache,output,temp}/**'],
  },
})
