import { useEffect, useState, useCallback } from 'react'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/addresses/{address}/moi-items).
import { getOnchainOwnedMoiItems } from '@gorae/contracts/sdk.gen'
import type { OnchainMoiItem } from '@gorae/contracts'
import { useZkLogin } from '../providers/ZkLoginProvider'

export function useOwnedItems() {
  const { address } = useZkLogin()
  const [items, setItems] = useState<OnchainMoiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    getOnchainOwnedMoiItems({ path: { address }, throwOnError: true })
      .then((res) => setItems(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  return { items, loading, refetch }
}
