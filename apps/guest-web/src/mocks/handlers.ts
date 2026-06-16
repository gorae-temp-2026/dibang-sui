/**
 * MSW 핸들러 단일 소스.
 *
 * 페이지·기능이 늘어나면 다음 패턴으로 분리:
 *   src/mocks/handlers/{page}.ts  ← 페이지별 핸들러
 *   src/mocks/handlers/index.ts   ← 모두 export
 *
 * 컨벤션: _code_convention/FRONTEND_TESTING.md § MSW 셋업
 */
import { http, HttpResponse } from 'msw'

export const handlers = [
  // 예시 — 실제 API 추가 시 교체
  http.get('/api/health', () => HttpResponse.json({ ok: true })),
]
