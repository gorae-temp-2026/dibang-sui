// ⚠️ TRANSITIONAL — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB는 표시 캐시 보조.
/**
 * 라운지 메모리(사진/글)의 온체인 기록 훅.
 *
 * 사용자 요구("사진·이름 정보는 walrus에 올리고 sui와 연결") 구현:
 *   사진 바이트 → walrusStore → photoBlobId, 글 → walrusStoreString → textBlobId
 *   → memory::create_memory(wedding, participation, text=textBlobId, photo_url=photoBlobId, matrix, clock).
 * 온체인엔 **Walrus blobId 참조만** 남는다 — 사진 원본·글 본문 평문은 온체인에 올리지 않는다(VISION §7).
 * SHARE_MEMORY → CS 신호가 온체인 분류·발행된다.
 *
 * 흐름: loungeId(DB) → getLounge → wedding_id → getWedding → sui_wedding_id
 *       → 온체인 Wedding → eventId → participation 확보 → executeOnchain(create_memory).
 */
import { useCallback } from 'react'
// getWedding/getLounge = DB(Go API 기존). getOnchainWedding/Participation = 온체인 프록시(/onchain/*).
import { getLounge, getWedding, getOnchainWedding, getOnchainParticipation } from '@gorae/contracts/sdk.gen'
import {
  buildCreateMemoryTx,
  walrusStore,
  walrusStoreString,
  ONCHAIN_BLOB_EPOCHS,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { compressImageForUpload } from '../lib/compress-image'

export interface OnchainMemoryInput {
  text: string
  file: File | null
}

export function useOnchainMemory(loungeId: string) {
  const { isAuthenticated, address, executeOnchain } = useZkLogin()

  return useCallback(
    async ({ text, file }: OnchainMemoryInput): Promise<string | null> => {
      if (!isAuthenticated || !address) return null
      try {
        // 1) loungeId(DB) → wedding_id(DB) → 온체인 Wedding 객체 ID
        const { data: lounge } = await getLounge({ path: { loungeId }, throwOnError: true })
        const weddingId = lounge?.wedding_id
        if (!weddingId) return null
        const { data: wedding } = await getWedding({ path: { weddingId }, throwOnError: true })
        const suiWeddingId = wedding?.sui_wedding_id
        if (!suiWeddingId) return null
        // 2) 온체인 Wedding → eventId + participation 확보 (Go API 프록시)
        const ow = (await getOnchainWedding({ path: { weddingId: suiWeddingId }, throwOnError: true })).data
        if (!ow?.eventId) return null
        const part = (await getOnchainParticipation({ path: { address }, query: { eventId: ow.eventId }, throwOnError: true })).data
        if (!part?.id) return null
        // 3) 사진·글을 Walrus에 올려 blobId만 확보(온체인 평문 회피).
        let photoBlobId = ''
        if (file) {
          const compressed = await compressImageForUpload(file)
          const bytes = new Uint8Array(await compressed.arrayBuffer())
          photoBlobId = await walrusStore(bytes, { epochs: ONCHAIN_BLOB_EPOCHS })
        }
        const textBlobId = text.trim() ? await walrusStoreString(text, { epochs: ONCHAIN_BLOB_EPOCHS }) : ''
        // 4) 온체인 memory 기록 — SHARE_MEMORY CS 신호 발행.
        return await executeOnchain(
          buildCreateMemoryTx({ weddingId: suiWeddingId, participationId: part.id, text: textBlobId, photoBlobId }),
        )
      } catch (e) {
        console.error('[memory] onchain failed:', e)
        return null
      }
    },
    [isAuthenticated, address, executeOnchain, loungeId],
  )
}
