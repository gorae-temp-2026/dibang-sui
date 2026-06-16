/**
 * Vitest 전역 셋업. vitest.config.ts 의 setupFiles 에서 로드.
 *
 * 역할:
 *  - @testing-library/jest-dom matchers 등록 (toBeVisible, toHaveTextContent 등)
 *
 * MSW는 첫 network 테스트(hook/query) 도입 시점에 server lifecycle을 여기에 추가.
 *
 * 컨벤션: _code_convention/FRONTEND_TESTING.md § MSW 셋업
 */
import '@testing-library/jest-dom/vitest'
