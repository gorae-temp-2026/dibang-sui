import './env'  // env 스키마 검증 — 부팅 시점에 누락·형식 오류 즉시 fail
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DAppKitProvider } from '@mysten/dapp-kit-react'
import { dAppKit } from './lib/dapp-kit'
import { ZkLoginProvider } from './providers/ZkLoginProvider'
import { AuthProvider } from './providers/AuthProvider'
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
  const queryClient = new QueryClient()

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('Root element #root not found')

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <DAppKitProvider dAppKit={dAppKit}>
          <ZkLoginProvider>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ZkLoginProvider>
        </DAppKitProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
