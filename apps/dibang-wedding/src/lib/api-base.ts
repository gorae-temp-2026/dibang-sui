/**
 * dibang-wedding 앱의 API base URL getter.
 *
 * contracts SDK는 packages/contracts/runtime/hey-api.ts가 env-aware로 baseUrl을 자동 해결하지만,
 * SDK 미경유 직접 fetch가 필요한 곳(예: lib/sharedPhotosZip의 ZIP 다운로드 endpoint)에서
 * env 참조를 함수 호출 시점에 위치시키기 위한 헬퍼.
 * (UI/데이터 분리 3-I + 라운드 4 머지: src/env.ts t3-env 스키마 경유)
 */
import { env } from '../env';

export function getApiBaseUrl(): string {
  return env.VITE_API_BASE_URL ?? 'http://localhost:8080';
}
