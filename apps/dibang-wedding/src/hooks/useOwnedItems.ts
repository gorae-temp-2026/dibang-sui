import { useEffect, useState, useCallback } from 'react'
import { createJsonRpcClient, getOwnedMoiItems, type MoiItemOnChain, type SuiNetwork } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

export function useOwnedItems() {
  const { address } = useZkLogin()
  const [items, setItems] = useState<MoiItemOnChain[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)
    getOwnedMoiItems(client, address)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  return { items, loading, refetch }
}
