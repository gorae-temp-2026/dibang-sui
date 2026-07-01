import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateOnchainCache } from '@gorae/contracts/sdk.gen'
import { useZkLogin } from '../providers/ZkLoginProvider'

/**
 * TX 성공(sui:tx-success) 시 온체인 캐시를 무효화해 "내 행동"을 즉시 반영한다.
 *  (1) 서버 캐시(Go /onchain/cache/invalidate): per-user 키(소유물·잔액) + 전역 이벤트 키(이음·시그널) drop.
 *      → per-user만 버리면 내 이음/시그널이 최대 30~60초 안 보이는 회귀 방지(BE-V 지적).
 *  (2) React Query 캐시(onchain* 키): invalidateQueries → useQuery 재조회.
 * 앱 루트에 1회 마운트한다(useState+useEffect 기반 훅들은 각자 sui:tx-success 리스너로 refetch).
 */
export function useOnchainInvalidation() {
  const { address } = useZkLogin()
  const queryClient = useQueryClient()
  useEffect(() => {
    const handler = () => {
      // (1) 서버 캐시 무효화(인덱서 반영 윈도가 있어 즉시 최신은 아님 — read-after-write는 개별 훅이 폴링).
      if (address) invalidateOnchainCache({ query: { address } }).catch(() => {})
      // (2) React Query 온체인 키 무효화.
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return typeof k === 'string' && (k.startsWith('onchain') || k === 'ownedMoi')
        },
      })
    }
    window.addEventListener('sui:tx-success', handler)
    return () => window.removeEventListener('sui:tx-success', handler)
  }, [address, queryClient])
}
