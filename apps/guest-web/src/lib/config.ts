/**
 * 런타임 환경 변수 접근을 단일 모듈로 모은다.
 *
 * UI presentational 컴포넌트가 env에 직접 의존하지 않도록 (W06 #7),
 * env 접근은 본 모듈의 getter를 통한다. env 자체는 `src/env.ts` 의 검증된
 * 스키마(`@t3-oss/env-core`)를 거친 객체만 사용한다.
 */

import { env } from '../env';

/**
 * Dibang Wedding(본체) 사이트 URL.
 *
 * - 운영/스테이지: `VITE_DIBANG_URL` 환경변수.
 * - 미설정 시 dev 폴백(`http://localhost:5200`).
 */
export function getDibangUrl(): string {
  return env.VITE_DIBANG_URL ?? 'http://localhost:5200';
}
