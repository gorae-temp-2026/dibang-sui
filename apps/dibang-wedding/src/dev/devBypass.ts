// ★ DEV 전용 — 비개발자 전체앱 클릭 프리뷰용 로그인 우회 플래그.
// 프로덕션 빌드에선 import.meta.env.DEV=false라 전부 데드코드로 제거(프로덕션 인증 무영향).
// 활성화: dev 서버 URL에 ?dev=1 한 번 → localStorage 플래그(이후 모든 라우트 우회).
export const DEV_BYPASS_KEY = 'dibang:dev-bypass'

// 모듈 로드 1회 — URL ?dev=1 이면 플래그 저장.
if (import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1') {
  try {
    window.localStorage.setItem(DEV_BYPASS_KEY, '1')
  } catch {
    /* noop */
  }
}

export function isDevBypass(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return window.localStorage.getItem(DEV_BYPASS_KEY) === '1'
  } catch {
    return false
  }
}
