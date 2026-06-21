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
import type { Moi, IncomingReq } from '../components/inyeon/types'

function toMoi(user: DiscoveredUser, idx: number): Moi {
  const addrNum = parseInt(user.address.slice(2, 10), 16)
  return {
    id: idx,
    name: `${user.address.slice(0, 6)}…${user.address.slice(-4)}`,
    photos: [{ hue: addrNum % 360 }],
    online: false,
    tier: user.degree <= 2 ? 0 : user.degree <= 4 ? 1 : 2,
    deg: user.degree,
    hook: user.degree === 1 ? '함께 참여한 결혼식이 있어요'
      : user.degree <= 3 ? `${user.degree}다리 건너 아는 사이에요`
      : '새로운 인연이에요',
    mutualCount: user.mutualCount,
    prov: user.sharedEventIds.length > 0
      ? [{ emoji: '💒', text: '함께 참여한 결혼식', sub: `${user.sharedEventIds.length}개`, tier: 0 as const }]
      : [],
    balLabel: user.degree <= 2 ? '높음' : user.degree <= 4 ? '보통' : '낮음',
    barsF: Math.max(0, 5 - user.degree),
    net: user.mutualCount,
    // 실 데이터 확장 필드(Moi 타입에 없지만 런타임에 접근 가능)
    ...(({ suiAddress: user.address, suiMoiId: user.moiId }) as Record<string, string>),
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
        setUsers(moiList)

        // 수락된 이음의 eventId 집합 (이미 매칭 성사된 것 필터용)
        const acceptedEventIds = new Set(acceptedEvents.map((a) => a.eventId))

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
                rel: '이음 신청',
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
        setMatchedAddresses(matched)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  return { users, incoming, sentMoiIds, matchedAddresses, loading, refetch }
}
