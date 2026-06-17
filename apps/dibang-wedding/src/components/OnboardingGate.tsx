import { Navigate, useLocation } from 'react-router'
import { useGetMe } from '../queries/shared/useGetMe'
import { useZkLogin } from '../providers/ZkLoginProvider'

// 인터셉트 페이지(/onboarding/consent) 자체에선 게이트 우회. 그 외엔 GetMe 응답의
// consents_required가 비어있지 않으면 /onboarding/consent?next=<현재 경로>로 리다이렉트.
//
// 사용 위치: AuthGuard 안쪽, 모든 보호된 라우트 element 외곽.
// _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md S-01·S-03
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  // 공유 useGetMe(staleTime 5분): 보호 라우트 진입마다 재요청하지 않고 캐시를 단일
  // 소스로 사용한다. 동의 직후엔 OnboardingConsentPage가 캐시를 낙관적으로 비우므로
  // 게이트가 옛 "동의 필요" 상태로 되돌리는 루프가 발생하지 않는다.
  const { data, isLoading, isError } = useGetMe()
  const { isDev } = useZkLogin()

  // dev 세션은 온보딩 게이트 우회 — dev user는 정상 가입(auth.users→trigger) 흐름을
  // 안 거쳐 consent/profiles FK 체인이 없다. dev 검증 전용(prod는 dev 세션 자체가 없음).
  if (isDev) {
    return <>{children}</>
  }

  // 인터셉트 페이지 자체에선 통과 (무한 리다이렉트 방지)
  if (location.pathname === '/onboarding/consent') {
    return <>{children}</>
  }

  // 로딩 중 또는 에러면 통과 (안전한 디폴트 — GetMe 실패 시 onboarding 강제 안 함).
  if (isLoading || isError || !data) {
    return <>{children}</>
  }

  const required = data.consents_required ?? []
  if (required.length === 0) {
    return <>{children}</>
  }

  // 동의 누락 → 인터셉트
  const next = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={`/onboarding/consent?next=${next}`} replace />
}
