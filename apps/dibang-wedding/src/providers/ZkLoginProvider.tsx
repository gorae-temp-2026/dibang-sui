/**
 * zkLogin 인증 Provider.
 *
 * Google 로그인으로 Sui 주소를 쓰게 하는 zkLogin 흐름을 React 컨텍스트로 감싼다.
 * sui-sdk의 zklogin 유틸을 사용한다. 트랜잭션 가스는 sponsor 서비스가 대납한다.
 *
 * 주의: 실제 로그인 완료(OAuth → ZK prover → 서명)는 실 Google OAuth client id와
 * 실행 중인 ZK prover가 있어야 동작한다. 미설정 시 login()은 안내만 한다.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import type { Transaction } from '@mysten/sui/transactions'
import {
  configureSui,
  createJsonRpcClient,
  generateEphemeralKey,
  getGoogleOAuthUrl,
  fetchSalt,
  fetchZkProof,
  zkLoginAddress,
  buildZkLoginSignature,
  sponsoredExecute,
  executeAndAssert,
  ephemeralKeypairFromSession,
  loadSession,
  saveSession,
  clearSession,
  type SuiNetwork,
  type ZkLoginSession,
  type ZkProofInputs,
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
const DEV_KEY = 'dibang.dev.sk'

interface PendingLogin {
  ephemeralSecretKey: string
  maxEpoch: number
  randomness: string
}

interface ZkLoginContextValue {
  session: ZkLoginSession | null
  address: string | null
  isAuthenticated: boolean
  /** dev keypair 세션 여부(온보딩 게이트 등 dev 우회 판별용). */
  isDev: boolean
  /** Google OAuth로 리다이렉트해 로그인 시작. */
  login: (redirectUri: string) => Promise<void>
  /** [DEV 전용] 고정 dev keypair로 즉시 세션 — Google OAuth 없는 헤드리스 테스트용. */
  devLogin: () => void
  /** OAuth 콜백 후 URL 프래그먼트의 id_token으로 세션을 완성. */
  completeLoginFromUrl: () => Promise<boolean>
  logout: () => void
  /** 빌더가 만든 tx를 zkLogin 서명 + sponsor 대납으로 실행하고 digest를 반환. */
  executeOnchain: (tx: Transaction) => Promise<string>
}

const ZkLoginContext = createContext<ZkLoginContextValue | null>(null)

async function fetchCurrentEpoch(network: SuiNetwork): Promise<number> {
  const client = createJsonRpcClient(network)
  const state = await client.getLatestSuiSystemState()
  return Number(state.epoch)
}

export function ZkLoginProvider({ children }: { children: ReactNode }) {
  // sessionStorage의 기존 세션으로 초기화(브라우저 전용 SPA — effect 내 setState 불필요).
  const [session, setSession] = useState<ZkLoginSession | null>(() => loadSession())
  // [DEV] Google OAuth 없이 고정 keypair로 로그인(헤드리스 테스트). 버튼은 import.meta.env.DEV에서만 노출.
  // sessionStorage에 비밀키를 저장해 새로고침·라우팅 후에도 dev 세션을 유지(Playwright 테스트용).
  const [devKeypair, setDevKeypair] = useState<Ed25519Keypair | null>(() => {
    const sk = sessionStorage.getItem(DEV_KEY)
    return sk ? Ed25519Keypair.fromSecretKey(sk) : null
  })
  const devLogin = useCallback(() => {
    const sk = env.VITE_DEV_PRIVATE_KEY
    if (!sk) throw new Error('VITE_DEV_PRIVATE_KEY 미설정 — dev 로그인 비활성')
    sessionStorage.setItem(DEV_KEY, sk)
    setDevKeypair(Ed25519Keypair.fromSecretKey(sk))
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

    // ZK 증명 조회 (prover 설정 시). 없으면 주소까지만 — 트랜잭션 서명은 prover 필요.
    let proofInputs: ZkProofInputs | undefined
    const proverUrl = env.VITE_ZK_PROVER_URL
    if (proverUrl) {
      const kp = Ed25519Keypair.fromSecretKey(pending.ephemeralSecretKey)
      proofInputs = await fetchZkProof({
        jwt,
        salt,
        ephemeralPublicKey: kp.getPublicKey(),
        maxEpoch: pending.maxEpoch,
        randomness: pending.randomness,
        proverUrl,
      })
    }

    const next: ZkLoginSession = {
      ephemeralSecretKey: pending.ephemeralSecretKey,
      maxEpoch: pending.maxEpoch,
      randomness: pending.randomness,
      jwt,
      salt,
      address,
      proofInputs,
    }
    saveSession(next)
    sessionStorage.removeItem(PENDING_KEY)
    setSession(next)
    return true
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    sessionStorage.removeItem(DEV_KEY)
    setDevKeypair(null)
  }, [])

  const executeOnchain = useCallback(
    async (tx: Transaction): Promise<string> => {
      // [DEV] dev keypair 세션이면 zkLogin proof·sponsor 없이 keypair로 직접 서명·실행.
      if (devKeypair) {
        const devClient = createJsonRpcClient((env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet')
        const res = await executeAndAssert(devClient, { transaction: tx, signer: devKeypair })
        return res.digest
      }
      if (!session) throw new Error('zkLogin 세션 없음 — 먼저 로그인하세요')
      if (!session.proofInputs) throw new Error('ZK 증명 없음 — VITE_ZK_PROVER_URL 설정 필요')
      const sponsorUrl = env.VITE_SPONSOR_URL
      if (!sponsorUrl) throw new Error('VITE_SPONSOR_URL 미설정 — 가스 대납 불가')

      const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
      const client = createJsonRpcClient(network)
      const ephemeral = ephemeralKeypairFromSession(session)
      const proofInputs = session.proofInputs

      const res = await sponsoredExecute({
        client,
        transaction: tx,
        senderAddress: session.address,
        sponsorUrl,
        // ephemeral 서명을 zkLogin 서명으로 감싼다.
        signUserTransaction: async (bytes) => {
          const { signature } = await ephemeral.signTransaction(bytes)
          return buildZkLoginSignature({
            proofInputs,
            maxEpoch: session.maxEpoch,
            userSignature: signature,
            salt: session.salt,
            jwt: session.jwt,
          })
        },
      })
      return res.digest
    },
    [session, devKeypair],
  )

  const value = useMemo<ZkLoginContextValue>(
    () => ({
      session,
      address: devKeypair?.toSuiAddress() ?? session?.address ?? null,
      isAuthenticated: !!session || !!devKeypair,
      isDev: !!devKeypair,
      login,
      devLogin,
      completeLoginFromUrl,
      logout,
      executeOnchain,
    }),
    [session, devKeypair, login, devLogin, completeLoginFromUrl, logout, executeOnchain],
  )

  return <ZkLoginContext.Provider value={value}>{children}</ZkLoginContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- provider 파일에 훅 동거(관용)
export function useZkLogin(): ZkLoginContextValue {
  const ctx = useContext(ZkLoginContext)
  if (!ctx) throw new Error('useZkLogin must be used within ZkLoginProvider')
  return ctx
}
