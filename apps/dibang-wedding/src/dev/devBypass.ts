// ★ DEV 전용 — 비개발자 전체앱 클릭 프리뷰용 로그인 우회 플래그.
// 프로덕션 빌드에선 import.meta.env.DEV=false라 전부 데드코드로 제거(프로덕션 인증 무영향).
// 정책(260621): dev 프리뷰는 기본 ON — ?dev=1 없이 바 URL 새로고침해도 fixture가 비지 않게.
//   해제는 URL ?dev=0 한 번(이후 localStorage '0'). 단위 테스트(MODE=test)는 실제 인증 경로 유지.
export const DEV_BYPASS_KEY = 'dibang:dev-bypass'

// 모듈 로드 1회 — URL ?dev=1/0 이면 선택 저장(opt-in / opt-out).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const p = new URLSearchParams(window.location.search).get('dev')
    if (p === '1') window.localStorage.setItem(DEV_BYPASS_KEY, '1')
    else if (p === '0') window.localStorage.setItem(DEV_BYPASS_KEY, '0')
  } catch {
    /* noop */
  }
}

export function isDevBypass(): boolean {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.MODE === 'test') return false // 테스트는 실제 인증 경로 유지
  try {
    return window.localStorage.getItem(DEV_BYPASS_KEY) !== '0' // 기본 ON, ?dev=0 만 해제
  } catch {
    return true
  }
}
