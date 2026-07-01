/**
 * 디방인연 카드 소스 — 온체인에서 Moi 소유자를 발견해 매칭 후보 목록을 구성한다.
 * DB/API 우회, Sui RPC 직접 조회(SSOT 방향).
 *
 * discoverUsers(SDK)가 MoiCreated 이벤트 + Participated 이벤트를 교차해
 * 공통 인연·함께 참여한 결혼식·관계 거리(degree)를 계산한다.
 */
import { useEffect, useState } from 'react'
import { normalizeSuiAddress } from '@mysten/sui/utils'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*, GraphQL). CORS·rate-limit·sunset 해소.
import { getOnchainDiscover, getOnchainIumRequested, getOnchainIumAccepted, getOnchainOwnedIumRequests, getOnchainSignals } from '@gorae/contracts/sdk.gen'
import type { OnchainDiscoveredUser, OnchainSignal } from '@gorae/contracts'
import { fetchInyeonProfiles } from './useInyeonProfileSync'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { translate, useLangStore } from '../lib/i18n'
import type { Moi, IncomingReq } from '../components/inyeon/types'

const lang = () => useLangStore.getState().lang

function avatarUrl(address: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${address.slice(2, 14)}&backgroundColor=b6e3f4`
}

function toMoi(user: OnchainDiscoveredUser, idx: number): Moi {
  const addrNum = parseInt(user.address.slice(2, 10), 16)
  return {
    id: idx,
    name: `${user.address.slice(0, 6)}…${user.address.slice(-4)}`,
    photos: [{ url: avatarUrl(user.address), hue: addrNum % 360 }],
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
    ...(({ suiAddress: normalizeSuiAddress(user.address), suiMoiId: user.moiId, ieumCount: 0, sharedEventIds: user.sharedEventIds }) as Record<string, unknown>),
  }
}

export function useDiscoverUsers() {
  const { address } = useZkLogin()
  const [users, setUsers] = useState<Moi[]>([])
  const [incoming, setIncoming] = useState<IncomingReq[]>([])
  const [sentMoiIds, setSentMoiIds] = useState<number[]>([])
  const [matchedAddresses, setMatchedAddresses] = useState<string[]>([])
  const [mySignal, setMySignal] = useState<{ em: number; cs: number }>({ em: 0, cs: 0 })
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
    const n = (a: string) => normalizeSuiAddress(a)
    const myAddr = n(address)
    Promise.all([
      getOnchainDiscover({ query: { address }, throwOnError: true }),
      getOnchainIumRequested({ throwOnError: true }),
      getOnchainIumAccepted({ throwOnError: true }),
      getOnchainOwnedIumRequests({ path: { address }, throwOnError: true }),
    ])
      .then(async ([discRes, iumRes, accRes, ownedRes]) => {
        const discovered = discRes.data ?? []
        const iumEvents = iumRes.data ?? []
        const acceptedEvents = accRes.data ?? []
        const ownedRequests = ownedRes.data ?? []
        // signal은 별도 조회 — 실패해도 카드 표시에 영향 없음(best-effort, RQ 없이 개별)
        let signalEvents: OnchainSignal[] = []
        try { const r = await getOnchainSignals(); signalEvents = r.data ?? [] } catch { /* best-effort */ }

        const moiList = discovered.map(toMoi)
        // DB에서 추가 사진 + 소개글 조회
        const allAddrs = moiList.map(m => (m as Moi & { suiAddress?: string }).suiAddress).filter(Boolean) as string[]
        const profileMap = await fetchInyeonProfiles(allAddrs).catch(() => new Map<string, { extraPhotos: string[]; bio: string }>())
        // 이음 성사 수 + signal + 추가 사진 합치기
        for (const m of moiList) {
          const addr = (m as Moi & { suiAddress?: string }).suiAddress
          if (addr) {
            const count = acceptedEvents.filter(e => n(e.initiator) === n(addr) || n(e.receiver) === n(addr)).length;
            (m as Moi & { ieumCount?: number }).ieumCount = count
            if (signalEvents.length > 0) {
              const pairSignals = signalEvents.filter(s => (n(s.from) === myAddr && n(s.to) === n(addr)) || (n(s.from) === n(addr) && n(s.to) === myAddr))
              const em = pairSignals.filter(s => s.kind === 0).reduce((sum, s) => sum + s.magnitude, 0)
              const cs = pairSignals.filter(s => s.kind !== 0).reduce((sum, s) => sum + s.magnitude, 0);
              (m as Moi & { signalEM?: number; signalCS?: number }).signalEM = em;
              (m as Moi & { signalEM?: number; signalCS?: number }).signalCS = cs
            }
            const profile = profileMap.get(addr)
            if (profile?.extraPhotos?.length) {
              const addrNum = parseInt(addr.slice(2, 10), 16)
              m.photos = [...m.photos, ...profile.extraPhotos.map((url, i) => ({ url, hue: (addrNum + (i + 1) * 60) % 360 }))]
            }
          }
        }
        setUsers(moiList)

        // 수락된 이음의 eventId 집합 (이미 매칭 성사된 것 필터용)
        const acceptedEventIds = new Set(acceptedEvents.map((a) => a.eventId))

        // 내가 보낸 이음 (수락된 건 제외)
        const mySent = iumEvents.filter((e) => n(e.initiator) === myAddr && !acceptedEventIds.has(e.eventId))
        setSentMoiIds(mySent.map((s) => {
          const targetMoi = moiList.find((m) => (m as Moi & { suiAddress?: string }).suiAddress === s.toUser)
          return targetMoi?.id ?? -1
        }).filter((id) => id !== -1))

        // 나한테 온 이음 — 소유한 IumRequest에서 requestId 확보 (수락 안 한 것만 남아있음)
        const requestByEvent = new Map(ownedRequests.map((r) => [r.eventId, r.requestId]))
        const myRequests = iumEvents.filter((e) => n(e.toUser) === myAddr && !acceptedEventIds.has(e.eventId))
        setIncoming(
          myRequests
            .filter((req) => requestByEvent.has(req.eventId))
            .map((req) => {
              const senderMoi = moiList.find((m) => n((m as Moi & { suiAddress?: string }).suiAddress ?? '') === n(req.initiator))
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
          .filter((a) => n(a.initiator) === myAddr || n(a.receiver) === myAddr)
          .map((a) => n(n(a.initiator) === myAddr ? a.receiver : a.initiator))
        setMatchedAddresses(matched)

        // 내 전체 signal (MeScreen ProfileSheet용)
        const mySignals = signalEvents.filter(s => n(s.from) === myAddr || n(s.to) === myAddr)
        const totalEM = mySignals.filter(s => s.kind === 0).reduce((sum, s) => sum + s.magnitude, 0)
        const totalCS = mySignals.filter(s => s.kind !== 0).reduce((sum, s) => sum + s.magnitude, 0)
        setMySignal({ em: totalEM, cs: totalCS })
      })
      .catch((err) => { console.error('[useDiscoverUsers] error:', err) })
      .finally(() => setLoading(false))
  }, [address, refreshKey])

  return { users, incoming, sentMoiIds, matchedAddresses, mySignal, loading, refetch }
}
