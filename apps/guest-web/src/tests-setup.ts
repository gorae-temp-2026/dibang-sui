/**
 * Vitest 전역 셋업. vitest.config.ts 의 setupFiles 에서 로드.
 *
 * 역할:
 *  - @testing-library/jest-dom matchers 등록 (toBeVisible, toHaveTextContent 등)
 *  - MSW server lifecycle 등록 (테스트 간 핸들러 격리)
 *
 * 컨벤션: _code_convention/FRONTEND_TESTING.md § MSW 셋업
 */
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
