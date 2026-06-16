/**
 * zkLogin 인증 Provider.
 *
 * Google 로그인으로 Sui 주소를 쓰게 하는 zkLogin 흐름을 React 컨텍스트로 감싼다.
 * sui-sdk의 zklogin 유틸을 사용한다. 트랜잭션 가스는 sponsor 서비스가 대납한다.
 *
 * 주의: 실제 로그인 완료(OAuth → ZK prover → 서명)는 실 Google OAuth client id와
 * 실행 중인 ZK prover가 있어야 동작한다. 미설정 시 login()은 안내만 한다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  configureSui,
  createJsonRpcClient,
  generateEphemeralKey,
  getGoogleOAuthUrl,
  fetchSalt,
  zkLoginAddress,
  loadSession,
  saveSession,
  clearSession,
  type SuiNetwork,
  type ZkLoginSession,
} from '@gorae/sui-sdk'
import { env } from '../env'

// 앱 시작 시 1회: sui-sdk 설정을 env로 덮어쓴다(미설정이면 testnet 기본값 유지).
if (env.VITE_SUI_PACKAGE_ID) {
  configureSui({
    network: (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet',
    packageId: env.VITE_SUI_PACKAGE_ID,
    ...(env.VITE_SUI_IUM_REGISTRY_ID ? { iumRegistryId: env.VITE_SUI_IUM_REGISTRY_ID } : {}),
  })
}

const PENDING_KEY = 'dibang.zklogin.pending'

interface PendingLogin {
  ephemeralSecretKey: string
  maxEpoch: number
  randomness: string
}

interface ZkLoginContextValue {
  session: ZkLoginSession | null
  address: string | null
  isAuthenticated: boolean
  /** Google OAuth로 리다이렉트해 로그인 시작. */
  login: (redirectUri: string) => Promise<void>
  /** OAuth 콜백 후 URL 프래그먼트의 id_token으로 세션을 완성. */
  completeLoginFromUrl: () => Promise<boolean>
  logout: () => void
}

const ZkLoginContext = createContext<ZkLoginContextValue | null>(null)

async function fetchCurrentEpoch(network: SuiNetwork): Promise<number> {
  const client = createJsonRpcClient(network)
  const state = await client.getLatestSuiSystemState()
  return Number(state.epoch)
}

export function ZkLoginProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ZkLoginSession | null>(null)

  useEffect(() => {
    setSession(loadSession())
  }, [])

  const login = useCallback(async (redirectUri: string) => {
    const clientId = env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID 미설정 — zkLogin 로그인 비활성')
    }
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const epoch = await fetchCurrentEpoch(network)
    const ek = generateEphemeralKey(epoch)
    // ephemeral key는 콜백에서 재사용해야 하므로 임시 저장.
    const pending: PendingLogin = {
      ephemeralSecretKey: ek.keypair.getSecretKey(),
      maxEpoch: ek.maxEpoch,
      randomness: ek.randomness,
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    window.location.href = getGoogleOAuthUrl({ clientId, redirectUri, nonce: ek.nonce })
  }, [])

  const completeLoginFromUrl = useCallback(async (): Promise<boolean> => {
    // implicit 플로우: id_token은 URL 프래그먼트(#id_token=...)로 온다.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const jwt = hash.get('id_token')
    const pendingRaw = sessionStorage.getItem(PENDING_KEY)
    if (!jwt || !pendingRaw) return false

    const pending = JSON.parse(pendingRaw) as PendingLogin
    const saltServerUrl = env.VITE_SALT_SERVER_URL
    if (!saltServerUrl) throw new Error('VITE_SALT_SERVER_URL 미설정')

    const salt = await fetchSalt(jwt, saltServerUrl)
    const address = zkLoginAddress(jwt, salt)

    const next: ZkLoginSession = {
      ephemeralSecretKey: pending.ephemeralSecretKey,
      maxEpoch: pending.maxEpoch,
      randomness: pending.randomness,
      jwt,
      salt,
      address,
    }
    saveSession(next)
    sessionStorage.removeItem(PENDING_KEY)
    setSession(next)
    return true
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const value = useMemo<ZkLoginContextValue>(
    () => ({
      session,
      address: session?.address ?? null,
      isAuthenticated: !!session,
      login,
      completeLoginFromUrl,
      logout,
    }),
    [session, login, completeLoginFromUrl, logout],
  )

  return <ZkLoginContext.Provider value={value}>{children}</ZkLoginContext.Provider>
}

export function useZkLogin(): ZkLoginContextValue {
  const ctx = useContext(ZkLoginContext)
  if (!ctx) throw new Error('useZkLogin must be used within ZkLoginProvider')
  return ctx
}
