import './env'  // env 스키마 검증 — 부팅 시점에 누락·형식 오류 즉시 fail
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DAppKitProvider } from '@mysten/dapp-kit-react'
import { dAppKit } from './lib/dapp-kit'
import { ZkLoginProvider } from './providers/ZkLoginProvider'
import './app.css'
import App from './App.tsx'

/**
 * SDK baseUrl·credentials 설정은 contracts runtime/hey-api.ts의
 * createClientConfig에 흡수되어 entry에서 명시 호출이 필요 없다.
 */
export function mount(): void {
  const queryClient = new QueryClient()

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    throw new Error('Root element #root not found')
  }

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <DAppKitProvider dAppKit={dAppKit}>
          <ZkLoginProvider>
            <App />
          </ZkLoginProvider>
        </DAppKitProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
