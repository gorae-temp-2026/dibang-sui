import { useEffect, useState, useCallback } from 'react'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainActionLogged, getOnchainParticipated, getOnchainNotesSent } from '@gorae/contracts/sdk.gen'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { translate, useLangStore } from '../lib/i18n'

const lang = () => useLangStore.getState().lang

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
    Promise.all([
      getOnchainActionLogged({ throwOnError: true }),
      getOnchainParticipated({ throwOnError: true }),
      getOnchainNotesSent({ query: { address }, throwOnError: true }),
    ]).then(([actRes, partRes, notesRes]) => {
      const actions = actRes.data ?? []
      const parts = partRes.data ?? []
      const notes = notesRes.data ?? []
      const feed: OnchainFeedItem[] = []

      for (const a of actions) {
        if (a.actionType === 0) {
          feed.push({ id: `give-${a.ts}`, type: 'give', actor: a.actor, target: a.target ?? null, amount: a.amount, ts: a.ts })
        } else if (a.actionType === 4) {
          feed.push({ id: `write-${a.ts}`, type: 'write', actor: a.actor, target: a.target ?? null, amount: 0, ts: a.ts })
        } else if (a.actionType === 6) {
          feed.push({ id: `invite-${a.ts}`, type: 'participate', actor: a.actor, target: a.target ?? null, amount: 0, ts: a.ts })
        }
      }

      for (const n of notes) {
        feed.push({ id: `note-${n.ts}`, type: 'note', actor: n.from, target: n.to, amount: 0, ts: n.ts, message: translate(lang(), 'feed.note', { id: n.blobId.slice(0, 8) }) })
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
