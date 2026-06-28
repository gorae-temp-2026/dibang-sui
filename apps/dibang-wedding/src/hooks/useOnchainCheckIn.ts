// ⚠️ TRANSITIONAL — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB는 보조.
/**
 * 라운지 체크인의 온체인 참석 기록(participate) 훅.
 *
 * 라운지 입장(LoungeCheckIn 생성)은 "결혼식 참석" = 신뢰망의 헤드라인 신호다. DB 체크인과 함께
 * 온체인 event::participate(GUEST)를 best-effort로 발행해 참가자→혼주 CS 신호를 온체인에 남긴다.
 *
 * 흐름: loungeId(DB) → getLounge → wedding_id → getWedding → sui_wedding_id
 *       → 온체인 getWedding(sui_wedding_id) → eventId → (미참가면) participate.
 * zkLogin 인증(또는 dev keypair) 상태에서만 동작. 실패해도 DB 체크인은 유지(전환기 dual-write).
 *
 * ⚠️ 단일 participate 보장(중복 = CS 신호 이중 계상): event::participate는 **온체인 멱등성이 없다**
 *    — 중복 호출 시 Participation SBT와 attendance CS 신호가 이중 계상돼 신용 무결성을 훼손한다(event.move).
 *    이 훅은 이제 입장 게이트(LoungeCheckInGatePage)·라운지 자동 체크인(useEnsureLoungeCheckIn)·링크 입장
 *    (useJoinWeddingFromParam) **3곳에서 같은 라운지로 동시 호출**될 수 있다. 게이트가 fire-and-forget로
 *    participate를 띄우고 곧장 /v2로 이동하면, v2의 자동 체크인이 게이트 tx 확정 전에 read-then-write 가드를
 *    통과해 두 번째 participate를 낼 수 있다. read 가드만으론 이 경쟁을 못 막으므로:
 *      (1) **모듈 레벨 in-flight Map**: 같은 (address|loungeId) 동시 요청은 단 1개 promise를 공유,
 *      (2) **세션 완료 Set**: 한 번 발행 성공하면 이 세션에선 재발행 스킵(RPC 인덱싱 지연 창 보강),
 *      (3) 기존 **온체인 read 가드**: 다른 세션/재방문은 기존 Participation을 읽어 스킵.
 *    이 3중으로 어디서 몇 번 호출되든 (address,event)당 participate는 1회만 나간다.
 */
import { useCallback } from 'react'
import { getLounge, getWedding } from '@gorae/contracts/sdk.gen'
import {
  buildParticipateTx,
  getWedding as getOnchainWedding,
  getParticipationForEvent,
  createJsonRpcClient,
  configureSui,
  type SuiNetwork,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

// 같은 (address|loungeId) participate 요청을 공유하는 in-flight 가드(모듈 스코프 — 컴포넌트 마운트 경계를 넘어 공유).
const inflightParticipate = new Map<string, Promise<string | null>>()
// 이번 세션에 이미 participate를 발행한 (address|loungeId) — RPC 인덱싱 지연으로 read 가드가 놓치는 창을 보강.
const doneParticipate = new Set<string>()

export function useOnchainCheckIn() {
  const { isAuthenticated, address, executeOnchain } = useZkLogin()

  return useCallback(
    async (loungeId: string): Promise<string | null> => {
      if (!isAuthenticated || !address) return null
      const key = `${address}|${loungeId}`
      // 이미 이 세션에 발행 완료 → 재발행 스킵.
      if (doneParticipate.has(key)) return null
      // 동시 요청은 같은 promise 공유(게이트·자동·링크 입장이 겹쳐도 1회만).
      const existing = inflightParticipate.get(key)
      if (existing) return existing

      const p = (async (): Promise<string | null> => {
        try {
          // 1) loungeId(DB) → wedding_id(DB)
          const { data: lounge } = await getLounge({ path: { loungeId }, throwOnError: true })
          const weddingId = lounge?.wedding_id
          if (!weddingId) return null
          // 2) wedding_id → 온체인 Wedding 객체 ID(sui_wedding_id)
          const { data: wedding } = await getWedding({ path: { weddingId }, throwOnError: true })
          const suiWeddingId = wedding?.sui_wedding_id
          if (!suiWeddingId) return null
          // 3) 온체인 Wedding → eventId
          const net = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
          if (env.VITE_SUI_PACKAGE_ID) configureSui({ network: net, packageId: env.VITE_SUI_PACKAGE_ID, originalPackageId: env.VITE_SUI_ORIGINAL_PACKAGE_ID })
          const client = createJsonRpcClient(net)
          const ow = await getOnchainWedding(client, suiWeddingId)
          if (!ow?.eventId) return null
          // 4) 이미 참가했으면(다른 세션·재입장 등) 중복 발행 안 함 → 세션 완료로 기록.
          const existingPart = (await getParticipationForEvent(client, address, ow.eventId))?.id
          if (existingPart) {
            doneParticipate.add(key)
            return null
          }
          const digest = await executeOnchain(buildParticipateTx({ eventId: ow.eventId, roleId: 1 }))
          // 발행 성공 → 이 세션에선 재발행 스킵(인덱싱 지연 보강).
          doneParticipate.add(key)
          return digest
        } catch (e) {
          console.error('[checkin participate] onchain failed:', e)
          return null
        }
      })()

      // in-flight 정리: settle 시 맵에서 제거(실패 시 다음 호출에 재시도 허용).
      void p.finally(() => {
        if (inflightParticipate.get(key) === p) inflightParticipate.delete(key)
      })
      inflightParticipate.set(key, p)
      return p
    },
    [isAuthenticated, address, executeOnchain],
  )
}
