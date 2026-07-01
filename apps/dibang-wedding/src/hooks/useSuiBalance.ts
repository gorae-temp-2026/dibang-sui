import { useEffect, useState, useCallback } from 'react'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/addresses/{address}/balance).
import { getOnchainBalance } from '@gorae/contracts/sdk.gen'
import { useZkLogin } from '../providers/ZkLoginProvider'

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
    getOnchainBalance({ path: { address }, throwOnError: true })
      .then((res) => setBalanceMist(BigInt(res.data?.mist ?? '0')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  const balanceSui = Number(balanceMist) / 1e9

  return { balanceMist, balanceSui, loading, refetch }
}
