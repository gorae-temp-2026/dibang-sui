import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 단위·통합 테스트 (Vitest + RTL). E2E(Playwright)와 분리.
// MSW는 첫 network 테스트 도입 시 setupFiles에 추가 예정.
// 컨벤션: _code_convention/FRONTEND_TESTING.md
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests-setup.ts'],
    css: false,
    exclude: ['node_modules/**', 'dist/**', '.{idea,git,cache,output,temp}/**'],
    // env.ts(t3-env)가 부팅 시점에 VITE_SUPABASE_URL/ANON_KEY를 zod로 검증한다.
    // 테스트 placeholder만 주입 — 실제 호출은 supabase 클라이언트 vi.mock으로 차단.
    env: {
      VITE_SUPABASE_URL: 'http://test.local',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
