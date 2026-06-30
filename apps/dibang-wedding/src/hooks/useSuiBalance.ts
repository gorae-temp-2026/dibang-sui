import { useEffect, useState, useCallback } from 'react'
import { createJsonRpcClient, type SuiNetwork } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

export function useSuiBalance() {
  const { address } = useZkLogin()
  const [balanceMist, setBalanceMist] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const handler = () => setTimeout(refetch, 2000)
    window.addEventListener('sui:tx-success', handler)
    return () => window.removeEventListener('sui:tx-success', handler)
  }, [refetch])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)
    client.getBalance({ owner: address, coinType: '0x2::sui::SUI' })
      .then((b) => setBalanceMist(BigInt(b.totalBalance)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  const balanceSui = Number(balanceMist) / 1e9

  return { balanceMist, balanceSui, loading, refetch }
}
