import { useEffect, useState, useCallback } from 'react'
import { createJsonRpcClient, getActionLoggedEvents, type ActionLoggedQuery, type SuiNetwork } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

export interface OnchainGiftEntry {
  actor: string
  target: string
  fromMe: boolean
  ts: number
}

export function useGiftLog() {
  const { address } = useZkLogin()
  const [gifts, setGifts] = useState<OnchainGiftEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)
    getActionLoggedEvents(client)
      .then((actions) => {
        const myGifts = actions
          .filter((a) => a.actionType === 3 && (a.actor === address || a.target === address))
          .map((a) => ({
            actor: a.actor,
            target: a.target ?? '',
            fromMe: a.actor === address,
            ts: a.ts,
          }))
        setGifts(myGifts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  const forCounterpart = (addr: string) =>
    gifts.filter((g) => g.actor === addr || g.target === addr)

  return { gifts, forCounterpart, loading, refetch }
}
