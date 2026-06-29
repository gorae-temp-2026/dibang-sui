import './env'  // env 스키마 검증 — 부팅 시점에 누락·형식 오류 즉시 fail
import { initDevLogger } from './lib/devLoggerInit'
initDevLogger()
import { setupApiAuthInterceptor } from './lib/apiAuthInterceptor'
setupApiAuthInterceptor()
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ZkLoginProvider } from './providers/ZkLoginProvider'
import { AuthProvider } from './providers/AuthProvider'
import { isDevBypass } from './dev/devBypass'
import { seedDevFixtures } from './dev/seedDevFixtures'
// CSS는 SPA entry 관례에 따라 top-level import 유지 (FOUC 방지).
import './App.css'
import App from './App.tsx'

/**
 * 앱 마운트 진입점.
 * module 평가 시점이 아닌 명시적 호출 시점에 부수효과(QueryClient 인스턴스화,
 * DOM 마운트)가 실행되도록 함수로 캡슐화한다. (UI/데이터 분리 P1-2)
 *
 * SDK baseUrl·credentials 설정은 contracts runtime/hey-api.ts의
 * createClientConfig에 흡수되어 entry에서 명시 호출이 필요 없다.
 */
export function mount(): void {
  // DEV 전용 — 로그인 우회 프리뷰: 철수 fixture 시드 + staleTime∞(더미 백엔드 refetch 방지). 프로덕션 무영향.
  const queryClient = isDevBypass()
    ? new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } } })
    : new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: false } } })
  if (isDevBypass()) seedDevFixtures(queryClient)

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('Root element #root not found')

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ZkLoginProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ZkLoginProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
