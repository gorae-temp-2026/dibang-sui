import { useEffect, useState } from 'react'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainEventCreated, getOnchainParticipated, getOnchainWeddingsCreated } from '@gorae/contracts/sdk.gen'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { useZkLogin } from '../providers/ZkLoginProvider'

export interface OnchainWeddingItem {
  eventId: string
  weddingId: string | null
  loungeId: string | null
  creator: string
  role: 'host' | 'guest'
  date: string
}

export function useOnchainWeddingList() {
  const { address } = useZkLogin()
  const [items, setItems] = useState<OnchainWeddingItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    Promise.all([
      getOnchainEventCreated({ throwOnError: true }),
      getOnchainParticipated({ throwOnError: true }),
      getOnchainWeddingsCreated({ throwOnError: true }), // 루프 밖 1회 조회(캐시 공유)
    ])
      .then(([evRes, partRes, wcRes]) => {
        const events = evRes.data ?? []
        const parts = partRes.data ?? []
        // eventId → {weddingId, loungeId} 맵(WeddingCreated)
        const wcMap = new Map((wcRes.data ?? []).map((w) => [w.eventId, w]))
        const weddingEvents = events.filter((e) => e.eventType === 0)
        const norm = (a: string) => normalizeSuiAddress(a)
        const myAddr = norm(address)
        const myParts = parts.filter((p) => norm(p.participant) === myAddr)
        const myEventIds = new Set(myParts.map((p) => p.eventId))

        const myWeddings = weddingEvents.filter(
          (e) => norm(e.creator) === myAddr || myEventIds.has(e.eventId),
        )

        const result: OnchainWeddingItem[] = []
        for (const e of myWeddings) {
          const isHost = e.creator === address
          const myPart = myParts.find((p) => p.eventId === e.eventId)
          const roleId = myPart?.roleId ?? (isHost ? 0 : 1)
          const wc = wcMap.get(e.eventId)

          result.push({
            eventId: e.eventId,
            weddingId: wc?.weddingId ?? null,
            loungeId: wc?.loungeId ?? null,
            creator: e.creator,
            role: roleId === 0 ? 'host' : 'guest',
            date: '',
          })
        }

        setItems(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  return { items, loading }
}
