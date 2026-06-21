/**
 * 디방인연 카드 소스 — 온체인에서 Moi 소유자를 발견해 매칭 후보 목록을 구성한다.
 * DB/API 우회, Sui RPC 직접 조회(SSOT 방향).
 *
 * discoverUsers(SDK)가 MoiCreated 이벤트 + Participated 이벤트를 교차해
 * 공통 인연·함께 참여한 결혼식·관계 거리(degree)를 계산한다.
 */
import { useEffect, useState } from 'react'
import { createJsonRpcClient, discoverUsers, type DiscoveredUser, type SuiNetwork } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'
import type { Moi } from '../components/inyeon/types'

function toMoi(user: DiscoveredUser, idx: number): Moi {
  const addrNum = parseInt(user.address.slice(2, 10), 16)
  return {
    id: idx,
    name: `${user.address.slice(0, 6)}…${user.address.slice(-4)}`,
    photos: [{ hue: addrNum % 360 }],
    online: false,
    tier: user.degree <= 2 ? 0 : user.degree <= 4 ? 1 : 2,
    deg: user.degree,
    hook: user.sharedEventIds.length > 0 ? '함께 참여한 결혼식이 있어요' : '디방 유니버스에서 만남',
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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    const client = createJsonRpcClient(network)
    discoverUsers(client, address)
      .then((discovered) => setUsers(discovered.map(toMoi)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  return { users, loading }
}
