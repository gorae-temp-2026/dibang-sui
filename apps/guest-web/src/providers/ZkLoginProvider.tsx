/**
 * zkLogin 인증 Provider.
 *
 * Google 로그인으로 Sui 주소를 쓰게 하는 zkLogin 흐름을 React 컨텍스트로 감싼다.
 * sui-sdk의 zklogin 유틸을 사용한다. 트랜잭션 가스는 sponsor 서비스가 대납한다.
 *
 * 주의: 실제 로그인 완료(OAuth → ZK prover → 서명)는 실 Google OAuth client id와
 * 실행 중인 ZK prover가 있어야 동작한다. 미설정 시 login()은 안내만 한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

// 앱 시작 시 1회: sui-sdk 설정을 env로 덮어쓴다(미설정이면 testnet 기본값 유지).
if (env.VITE_SUI_PACKAGE_ID) {
  configureSui({
    network: (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet',
    packageId: env.VITE_SUI_PACKAGE_ID,
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
  // [DEV] 헤드리스 검증용 고정 keypair(VITE_DEV_PRIVATE_KEY). 실 게스트는 login()→OAuth 콜백으로
  // *본인 zkLogin* 서명한다(#18, 결정 2026-06-21: 익명/대리서명 폐기). dev key 미설정 시 null.
  const [devKeypair] = useState<Ed25519Keypair | null>(() => {
    const sk = env.VITE_DEV_PRIVATE_KEY
    return sk ? Ed25519Keypair.fromSecretKey(sk) : null
  })

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
    return true
  }, [])

  // OAuth 콜백 처리: Google에서 #id_token 프래그먼트로 돌아오면 세션을 완성하고 프래그먼트를 지운다.
  // 이게 없으면 login()으로 Google에 다녀와도 세션이 안 만들어져 zkLogin이 결코 완성되지 않는다
  // (게스트 본인 서명 배선의 핵심 — 결정 2026-06-21: 익명/claim 폐기, 게스트도 본인 지갑 서명).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.hash.includes('id_token=')) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- OAuth 콜백 1회 처리: setSession은 salt/proof 네트워크 후 비동기(.then)라 동기 cascading 아님
    completeLoginFromUrl()
      .then((ok) => {
        // 토큰 노출·재처리 방지: 성공 시 프래그먼트 제거.
        if (ok) window.history.replaceState(null, '', window.location.pathname + window.location.search)
      })
      .catch((e) => console.error('[zkLogin] 콜백 처리 실패:', e))
  }, [completeLoginFromUrl])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
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
      if (status !== 'success') throw new Error(`트랜잭션 실패: ${res.effects?.status?.error ?? status}`)
      return res.digest
    },
    [session, devKeypair],
  )

  const value = useMemo<ZkLoginContextValue>(
    () => ({
      session,
      address: devKeypair?.toSuiAddress() ?? session?.address ?? null,
      isAuthenticated: !!session || !!devKeypair,
      login,
      completeLoginFromUrl,
      logout,
      executeOnchain,
    }),
    [session, devKeypair, login, completeLoginFromUrl, logout, executeOnchain],
  )

  return <ZkLoginContext.Provider value={value}>{children}</ZkLoginContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- provider 파일에 훅 동거(관용)
export function useZkLogin(): ZkLoginContextValue {
  const ctx = useContext(ZkLoginContext)
  if (!ctx) throw new Error('useZkLogin must be used within ZkLoginProvider')
  return ctx
}
