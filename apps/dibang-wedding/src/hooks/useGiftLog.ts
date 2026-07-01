import { useEffect, useState, useCallback } from 'react'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/events/action-logged).
import { getOnchainActionLogged } from '@gorae/contracts/sdk.gen'
import { useZkLogin } from '../providers/ZkLoginProvider'

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
    getOnchainActionLogged({ throwOnError: true })
      .then((res) => {
        const actions = res.data ?? []
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
