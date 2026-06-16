/**
 * MSW Node 서버 — 테스트 환경 전용.
 * 브라우저용 worker는 필요해질 때 별도 mocks/browser.ts 신설.
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
