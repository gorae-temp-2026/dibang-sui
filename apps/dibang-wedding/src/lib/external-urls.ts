// 외부 URL/경로 빌더 — env 직접 참조와 window 결합을 page에서 분리.
// guest-web 등 다른 앱의 origin은 여기서만 읽고, 라우터 경로(react-router용)는 빌더 함수로 노출한다.

import { env } from '../env';

export function getGuestWebOrigin(): string {
  return env.VITE_GUEST_WEB_URL ?? 'http://localhost:5201';
}

export function buildDisplayUrl(weddingId: string): string {
  return `${getGuestWebOrigin()}/display?weddingId=${weddingId}`;
}

export function buildSharePhotoUploadPath(loungeId: string): string {
  return `/lounge/${loungeId}/share-photos/upload`;
}
