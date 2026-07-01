// ⚠️ TRANSITIONAL — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB는 표시 캐시 보조.
/**
 * 라운지 공지(announcement)의 온체인 기록 훅.
 *
 * 혼주가 올리는 공지를 온체인 Announcement(공유 오브젝트)로도 남긴다. WeddingCap 보유 혼주만 가능.
 * 공지 본문은 온체인 평문 금지(VISION §7) → walrusStoreString으로 Walrus에 올리고 온체인엔
 * **Walrus blobId 참조만** 남긴다(memory·write_message와 동일 패턴).
 *
 * 흐름: loungeId(DB) → getLounge → wedding_id → getWedding → sui_wedding_id
 *       → getWeddingCapForWedding(호스트 cap) → walrusStoreString(message)=blobId
 *       → executeOnchain(create_announcement). zkLogin 인증(또는 dev keypair)·cap 보유 시에만 동작.
 *       DB 저장(표시용 Supabase)과 함께 best-effort dual-write — 실패해도 DB 공지는 유지.
 *
 * 멱등성: 의도적으로 가드를 두지 않는다. create_announcement는 매번 새 공유 Announcement를 만들어
 *   멱등이 아니지만, 공지는 표시 전용이라 신뢰/원장 부수효과가 없어(중복은 화면 캐시에서 DB id로 흡수)
 *   중복 발행의 비용이 낮다. (대조: event::participate는 신뢰 신호 이중계상을 막으려 클라가 가드한다.)
 */
import { useCallback } from 'react'
// getWedding/getLounge = DB(Go API 기존). getOnchainWeddingCap = 온체인 프록시(/onchain/*).
import { getLounge, getWedding, getOnchainWeddingCap } from '@gorae/contracts/sdk.gen'
import {
  buildCreateAnnouncementTx,
  walrusStoreString,
  ONCHAIN_BLOB_EPOCHS,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'

export interface OnchainAnnouncementInput {
  message: string
  isPinned?: boolean
}

export function useOnchainAnnouncement(loungeId: string) {
  const { isAuthenticated, address, executeOnchain } = useZkLogin()

  return useCallback(
    async ({ message, isPinned }: OnchainAnnouncementInput): Promise<string | null> => {
      if (!isAuthenticated || !address) return null
      if (!message.trim()) return null
      try {
        // 1) loungeId(DB) → wedding_id(DB) → 온체인 Wedding 객체 ID
        const { data: lounge } = await getLounge({ path: { loungeId }, throwOnError: true })
        const weddingId = lounge?.wedding_id
        if (!weddingId) return null
        const { data: wedding } = await getWedding({ path: { weddingId }, throwOnError: true })
        const suiWeddingId = wedding?.sui_wedding_id
        if (!suiWeddingId) return null
        // 2) 호스트가 이 결혼식의 WeddingCap을 보유해야 공지 생성 가능(없으면 온체인 미수행).
        // ⚠️ getOnchainWeddingCap은 {capId} 객체 반환(P0-V 관찰) → data.capId로 읽음.
        const capId = (await getOnchainWeddingCap({ path: { address }, query: { weddingId: suiWeddingId }, throwOnError: true })).data?.capId
        if (!capId) return null
        // 3) 공지 본문 → Walrus → blobId(온체인 평문 회피). blobId가 온체인에 남으므로 내구 epoch로 저장.
        const messageBlobId = await walrusStoreString(message, { epochs: ONCHAIN_BLOB_EPOCHS })
        // 4) 온체인 create_announcement — message 필드엔 Walrus blobId 참조만 들어간다.
        return await executeOnchain(
          buildCreateAnnouncementTx({ capId, messageBlobId, isPinned: isPinned ?? false }),
        )
      } catch (e) {
        console.error('[announcement] onchain failed:', e)
        return null
      }
    },
    [isAuthenticated, address, executeOnchain, loungeId],
  )
}
