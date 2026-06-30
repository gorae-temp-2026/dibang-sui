import { useEffect, useState } from 'react'
import {
  createJsonRpcClient,
  getEventCreatedEvents,
  getParticipatedEvents,
  type SuiNetwork,
} from '@gorae/sui-sdk'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

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
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)

    Promise.all([getEventCreatedEvents(client), getParticipatedEvents(client)])
      .then(async ([events, parts]) => {
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

          let weddingId: string | null = null
          let loungeId: string | null = null
          try {
            const objs = await client.queryEvents({
              query: { MoveEventType: `${env.VITE_SUI_PACKAGE_ID || '0xf3c24dcc1455a12c3b066e4d9d40112d7be66dd0ccdfe729b9781b42e28f975e'}::wedding::WeddingCreated` },
              limit: 50,
            })
            const found = objs.data.find((ev) => {
              const p = ev.parsedJson as Record<string, unknown>
              return String(p.event_id) === e.eventId
            })
            if (found) {
              const p = found.parsedJson as Record<string, unknown>
              weddingId = String(p.wedding_id)
              if (p.lounge_id) loungeId = String(p.lounge_id)
            }
          } catch {}

          result.push({
            eventId: e.eventId,
            weddingId,
            loungeId,
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
