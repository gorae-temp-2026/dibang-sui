/**
 * 디방인연 카드 소스 — 온체인에서 Moi 소유자를 발견해 매칭 후보 목록을 구성한다.
 * DB/API 우회, Sui RPC 직접 조회(SSOT 방향).
 *
 * discoverUsers(SDK)가 MoiCreated 이벤트 + Participated 이벤트를 교차해
 * 공통 인연·함께 참여한 결혼식·관계 거리(degree)를 계산한다.
 */
import { useEffect, useState } from 'react'
import { createJsonRpcClient, discoverUsers, getIumRequestedEvents, getIumAcceptedEvents, getOwnedIumRequests, type DiscoveredUser, type SuiNetwork } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'
import { translate, useLangStore } from '../lib/i18n'
import type { Moi, IncomingReq } from '../components/inyeon/types'

const lang = () => useLangStore.getState().lang

function toMoi(user: DiscoveredUser, idx: number): Moi {
  const addrNum = parseInt(user.address.slice(2, 10), 16)
  return {
    id: idx,
    name: `${user.address.slice(0, 6)}…${user.address.slice(-4)}`,
    photos: [{ hue: addrNum % 360 }],
    online: false,
    tier: user.sharedEventIds.length > 0 ? 0 : user.degree <= 6 ? 1 : 2,
    deg: user.degree,
    hook: user.sharedEventIds.length > 0 ? translate(lang(), 'inyeon.tier.0.hook')
      : user.degree <= 6 ? translate(lang(), 'inyeon.tier.1.hook')
      : translate(lang(), 'inyeon.tier.2.hook'),
    mutualCount: user.mutualCount,
    prov: user.sharedEventIds.length > 0
      ? [{ emoji: '💒', text: translate(lang(), 'inyeon.prov.sharedWedding'), sub: translate(lang(), 'inyeon.prov.weddingCount', { n: user.sharedEventIds.length }), tier: 0 as const }]
      : user.degree <= 6 ? [{ emoji: '🤝', text: translate(lang(), 'inyeon.prov.throughAcquaintance'), sub: translate(lang(), 'inyeon.prov.degree', { n: user.degree }), tier: 1 as const }]
      : [{ emoji: '✨', text: translate(lang(), 'inyeon.prov.newConnection'), tier: 2 as const }],
    balLabel: user.degree <= 2 ? translate(lang(), 'trust.high') : user.degree <= 4 ? translate(lang(), 'trust.medium') : translate(lang(), 'trust.low'),
    barsF: Math.max(0, 5 - user.degree),
    net: user.mutualCount,
    // 실 데이터 확장 필드(Moi 타입에 없지만 런타임에 접근 가능)
    ...(({ suiAddress: user.address, suiMoiId: user.moiId, ieumCount: 0 }) as Record<string, unknown>),
  }
}

export function useDiscoverUsers() {
  const { address } = useZkLogin()
  const [users, setUsers] = useState<Moi[]>([])
  const [incoming, setIncoming] = useState<IncomingReq[]>([])
  const [sentMoiIds, setSentMoiIds] = useState<number[]>([])
  const [matchedAddresses, setMatchedAddresses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    const handler = () => setTimeout(refetch, 2000)
    window.addEventListener('sui:tx-success', handler)
    return () => window.removeEventListener('sui:tx-success', handler)
  }, [])

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)
    Promise.all([
      discoverUsers(client, address),
      getIumRequestedEvents(client),
      getIumAcceptedEvents(client),
      getOwnedIumRequests(client, address),
    ])
      .then(([discovered, iumEvents, acceptedEvents, ownedRequests]) => {
        const moiList = discovered.map(toMoi)
        // 이음 성사 수 채우기(IumAccepted에서 유저별 카운트)
        for (const m of moiList) {
          const addr = (m as Moi & { suiAddress?: string }).suiAddress
          if (addr) {
            const count = acceptedEvents.filter(e => e.initiator === addr || e.receiver === addr).length;
            (m as Moi & { ieumCount?: number }).ieumCount = count
          }
        }
        setUsers(moiList)

        // 수락된 이음의 eventId 집합 (이미 매칭 성사된 것 필터용)
        const acceptedEventIds = new Set(acceptedEvents.map((a) => a.eventId))

        console.log('[useDiscoverUsers] accepted:', acceptedEvents.length, 'acceptedEventIds:', [...acceptedEventIds])
        // 내가 보낸 이음 (수락된 건 제외)
        const mySent = iumEvents.filter((e) => e.initiator === address && !acceptedEventIds.has(e.eventId))
        setSentMoiIds(mySent.map((s) => {
          const targetMoi = moiList.find((m) => (m as Moi & { suiAddress?: string }).suiAddress === s.toUser)
          return targetMoi?.id ?? -1
        }).filter((id) => id !== -1))

        // 나한테 온 이음 — 소유한 IumRequest에서 requestId 확보 (수락 안 한 것만 남아있음)
        const requestByEvent = new Map(ownedRequests.map((r) => [r.eventId, r.requestId]))
        const myRequests = iumEvents.filter((e) => e.toUser === address && !acceptedEventIds.has(e.eventId))
        setIncoming(
          myRequests
            .filter((req) => requestByEvent.has(req.eventId))
            .map((req) => {
              const senderMoi = moiList.find((m) => (m as Moi & { suiAddress?: string }).suiAddress === req.initiator)
              return {
                moiId: senderMoi?.id ?? -1,
                rel: translate(lang(), 'page.inyeon.requestIeum'),
                msg: '',
                eventId: req.eventId,
                requestId: requestByEvent.get(req.eventId) ?? '',
              }
            }).filter((r) => r.moiId !== -1),
        )

        // 매칭 성사된 상대 주소 목록 (채팅 진입용)
        const matched = acceptedEvents
          .filter((a) => a.initiator === address || a.receiver === address)
          .map((a) => a.initiator === address ? a.receiver : a.initiator)
        console.log('[useDiscoverUsers] matchedAddresses:', matched, 'sentPending:', mySent.length)
        setMatchedAddresses(matched)
      })
      .catch((err) => { console.error('[useDiscoverUsers] error:', err) })
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  return { users, incoming, sentMoiIds, matchedAddresses, loading, refetch }
}
