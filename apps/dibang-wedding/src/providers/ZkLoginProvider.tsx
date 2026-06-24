/**
 * zkLogin 인증 Provider.
 *
 * Google 로그인으로 Sui 주소를 쓰게 하는 zkLogin 흐름을 React 컨텍스트로 감싼다.
 * sui-sdk의 zklogin 유틸을 사용한다. 가스비는 유저 본인 SUI로 직접 지불.
 *
 * 주의: 실제 로그인 완료(OAuth → ZK prover → 서명)는 실 Google OAuth client id와
 * 실행 중인 ZK prover가 있어야 동작한다. 미설정 시 login()은 안내만 한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast, Toaster } from 'sonner'
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
  executeAndAssert,
  ephemeralKeypairFromSession,
  loadSession,
  saveSession,
  clearSession,
  type SuiNetwork,
  type ZkLoginSession,
} from '@gorae/sui-sdk'
import { env } from '../env'
import { devLogger } from '../lib/devLogger'

// 앱 시작 시 1회: sui-sdk 설정을 env로 덮어쓴다(미설정이면 testnet 기본값 유지).
if (env.VITE_SUI_PACKAGE_ID) {
  configureSui({
    network: (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet',
    packageId: env.VITE_SUI_PACKAGE_ID,
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

  // 세션 만료 검증 — maxEpoch가 현재 에포크 이하면 자동 로그아웃.
  useEffect(() => {
    if (!session) return
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    let cancelled = false
    fetchCurrentEpoch(network).then((epoch) => {
      if (cancelled) return
      if (epoch >= session.maxEpoch) {
        console.warn('[zkLogin] 세션 만료 — maxEpoch', session.maxEpoch, '현재', epoch)
        clearSession()
        setSession(null)
      }
    }).catch(() => { /* 네트워크 실패 시 기존 세션 유지 */ })
    return () => { cancelled = true }
  }, [session])

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
    devLogger.log('auth', 'zklogin_redirect', { redirectUri, maxEpoch: ek.maxEpoch })
    window.location.href = getGoogleOAuthUrl({ clientId, redirectUri, nonce: ek.nonce })
  }, [])

  const completeLoginFromUrl = useCallback(async (): Promise<boolean> => {
    // implicit 플로우: id_token은 URL 프래그먼트(#id_token=...)로 온다.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const jwt = hash.get('id_token')
    const pendingRaw = sessionStorage.getItem(PENDING_KEY)
    if (!jwt || !pendingRaw) return false

    const pending = JSON.parse(pendingRaw) as PendingLogin
    const proverUrl = env.VITE_ZK_PROVER_URL
    if (!proverUrl) throw new Error('VITE_ZK_PROVER_URL 미설정')

    const kp = Ed25519Keypair.fromSecretKey(pending.ephemeralSecretKey)
    const proofResult = await fetchZkProof({
      jwt,
      salt: '',
      ephemeralPublicKey: kp.getPublicKey(),
      maxEpoch: pending.maxEpoch,
      randomness: pending.randomness,
      proverUrl,
      enokiApiKey: env.VITE_ENOKI_API_KEY,
      network: env.VITE_SUI_NETWORK ?? 'testnet',
    })

    // Enoki가 addressSeed를 돌려주면 그걸로 주소 계산(Go salt 서버 불필요).
    const addressSeed = (proofResult as { addressSeed?: string }).addressSeed
    let address: string
    if (addressSeed) {
      const { computeZkLoginAddressFromSeed, decodeJwt: decodeJwtDynamic } = await import('@mysten/sui/zklogin')
      const claims = decodeJwtDynamic(jwt)
      address = computeZkLoginAddressFromSeed(BigInt(addressSeed), claims.iss!, false)
    } else {
      const saltServerUrl = env.VITE_SALT_SERVER_URL
      if (!saltServerUrl) throw new Error('VITE_SALT_SERVER_URL 미설정')
      const salt = await fetchSalt(jwt, saltServerUrl)
      address = zkLoginAddress(jwt, salt)
    }

    const next: ZkLoginSession = {
      ephemeralSecretKey: pending.ephemeralSecretKey,
      maxEpoch: pending.maxEpoch,
      randomness: pending.randomness,
      jwt,
      salt: '',
      address,
      proofInputs: proofResult,
    }
    saveSession(next)
    sessionStorage.removeItem(PENDING_KEY)
    setSession(next)
    devLogger.log('auth', 'zklogin_complete', { address, maxEpoch: next.maxEpoch })

    // Supabase 세션도 동시 생성 — Go API 인증용 (같은 Google JWT 재사용)
    try {
      const { getSupabaseClient } = await import('../lib/supabase')
      const supabase = getSupabaseClient()
      if (supabase) {
        await supabase.auth.signInWithIdToken({ provider: 'google', token: jwt })
        devLogger.log('auth', 'supabase_session_created', { address })
      }
    } catch (e) {
      devLogger.log('auth', 'supabase_session_failed', { error: (e as Error).message })
    }

    return true
  }, [])

  const logout = useCallback(() => {
    devLogger.log('auth', 'logout', {})
    clearSession()
    setSession(null)
    sessionStorage.removeItem(DEV_KEY)
    setDevKeypair(null)
  }, [])

  const showTxToast = useCallback((digest: string, network: string) => {
    const url = `https://suiscan.xyz/${network}/tx/${digest}`
    toast.success('TX 성공', {
      description: digest.slice(0, 16) + '…',
      action: { label: '보기 →', onClick: () => window.open(url, '_blank') },
      duration: 6000,
    })
    window.dispatchEvent(new CustomEvent('sui:tx-success', { detail: { digest } }))
  }, [])

  const executeOnchain = useCallback(
    async (tx: Transaction): Promise<string> => {
      const net = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
      if (devKeypair) {
        const devClient = createJsonRpcClient(net)
        devLogger.log('sui', 'executeOnchain_start', { mode: 'devKeypair' })
        const res = await executeAndAssert(devClient, { transaction: tx, signer: devKeypair })
        devLogger.log('sui', 'executeOnchain_success', { digest: res.digest })
        showTxToast(res.digest, net)
        return res.digest
      }
      if (!session) throw new Error('zkLogin 세션 없음 — 먼저 로그인하세요')
      if (!session.proofInputs) throw new Error('ZK 증명 없음 — VITE_ZK_PROVER_URL 설정 필요')

      const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
      const client = createJsonRpcClient(network)
      const ephemeral = ephemeralKeypairFromSession(session)

      tx.setSender(session.address)
      const built = await tx.build({ client })
      const { signature: ephSig } = await ephemeral.signTransaction(built)
      const zkSig = buildZkLoginSignature({
        proofInputs: session.proofInputs,
        maxEpoch: session.maxEpoch,
        userSignature: ephSig,
        salt: session.salt,
        jwt: session.jwt,
      })
      const res = await client.executeTransactionBlock({
        transactionBlock: built,
        signature: zkSig,
        options: { showEffects: true, showObjectChanges: true },
      })
      const status = res.effects?.status?.status
      if (status !== 'success') {
        devLogger.log('sui', 'tx_error', { error: res.effects?.status?.error, status })
        throw new Error(`트랜잭션 실패: ${res.effects?.status?.error ?? status}`)
      }
      devLogger.log('sui', 'executeOnchain_success', { digest: res.digest, mode: 'zkLogin' })
      showTxToast(res.digest, net)
      return res.digest
    },
    [session, devKeypair, showTxToast],
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

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
      <Toaster position="bottom-center" richColors />
    </ZkLoginContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- provider 파일에 훅 동거(관용)
export function useZkLogin(): ZkLoginContextValue {
  const ctx = useContext(ZkLoginContext)
  if (!ctx) throw new Error('useZkLogin must be used within ZkLoginProvider')
  return ctx
}
