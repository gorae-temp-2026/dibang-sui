import { useEffect, useState, useCallback } from 'react'
import {
  createJsonRpcClient,
  getActionLoggedEvents,
  getParticipatedEvents,
  getNoteSentEvents,
  type SuiNetwork,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

export interface OnchainFeedItem {
  id: string
  type: 'give' | 'write' | 'rsvp' | 'participate' | 'note'
  message?: string
  actor: string
  target: string | null
  amount: number
  ts: number
}

export interface OnchainLoungeData {
  feed: OnchainFeedItem[]
  weddingId: string | null
  primaryHost: string | null
  vaultBalance: bigint
  rsvpCount: number
  participantCount: number
}

export function useOnchainLoungeFeed(weddingId?: string) {
  const { address } = useZkLogin()
  const [data, setData] = useState<OnchainLoungeData>({
    feed: [], weddingId: null, primaryHost: null, vaultBalance: 0n, rsvpCount: 0, participantCount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)

    Promise.all([
      getActionLoggedEvents(client),
      getParticipatedEvents(client),
      getNoteSentEvents(client, address),
    ]).then(([actions, parts, notes]) => {
      const feed: OnchainFeedItem[] = []

      for (const a of actions) {
        if (a.actionType === 0) {
          feed.push({ id: `give-${a.ts}`, type: 'give', actor: a.actor, target: a.target, amount: a.amount, ts: a.ts })
        } else if (a.actionType === 4) {
          feed.push({ id: `write-${a.ts}`, type: 'write', actor: a.actor, target: a.target, amount: 0, ts: a.ts })
        } else if (a.actionType === 6) {
          feed.push({ id: `invite-${a.ts}`, type: 'participate', actor: a.actor, target: a.target, amount: 0, ts: a.ts })
        }
      }

      for (const n of notes) {
        feed.push({ id: `note-${n.ts}`, type: 'note', actor: n.from, target: n.to, amount: 0, ts: n.ts, message: `쪽지: ${n.blobId.slice(0, 8)}...` })
      }

      feed.sort((a, b) => b.ts - a.ts)

      setData({
        feed,
        weddingId: weddingId ?? null,
        primaryHost: null,
        vaultBalance: 0n,
        rsvpCount: 0,
        participantCount: parts.filter(p => p.roleId === 1).length,
      })
    })
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [address, weddingId, refreshKey])

  return { ...data, loading, refetch }
}
