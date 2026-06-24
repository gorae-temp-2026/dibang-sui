// ⚠️ TRANSITIONAL — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB는 표시 캐시 보조.
/**
 * 라운지 메모리(사진/글)의 온체인 기록 훅.
 *
 * 사용자 요구("사진·이름 정보는 walrus에 올리고 sui와 연결") 구현:
 *   사진 바이트 → walrusStore → photoBlobId, 글 → walrusStoreString → textBlobId
 *   → memory::create_memory(wedding, text=textBlobId, photo_url=photoBlobId).
 * 온체인엔 **Walrus blobId 참조만** 남는다 — 사진 원본·글 본문 평문은 온체인에 올리지 않는다(VISION §7).
 *
 * 흐름: loungeId(DB) → getLounge → wedding_id → getWedding → sui_wedding_id
 *       → executeOnchain(create_memory). zkLogin 인증(또는 dev keypair) 상태에서만 동작.
 *       DB 저장(표시용 Supabase)과 함께 best-effort dual-write — 실패해도 DB 메모리는 유지.
 */
import { useCallback } from 'react'
import { getLounge, getWedding } from '@gorae/contracts/sdk.gen'
import {
  buildCreateMemoryTx,
  walrusStore,
  walrusStoreString,
  configureSui,
  ONCHAIN_BLOB_EPOCHS,
  type SuiNetwork,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { compressImageForUpload } from '../lib/compress-image'
import { env } from '../env'

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
        // 2) 사진·글을 Walrus에 올려 blobId만 확보(온체인 평문 회피).
        //    blobId가 온체인에 남으므로 내구 epoch로 저장(짧으면 GC 후 온체인 참조 dangling).
        let photoBlobId = ''
        if (file) {
          const compressed = await compressImageForUpload(file)
          const bytes = new Uint8Array(await compressed.arrayBuffer())
          photoBlobId = await walrusStore(bytes, { epochs: ONCHAIN_BLOB_EPOCHS })
        }
        const textBlobId = text.trim() ? await walrusStoreString(text, { epochs: ONCHAIN_BLOB_EPOCHS }) : ''
        // 3) 온체인 memory 기록 — text/photo_url 필드엔 Walrus blobId 참조만 들어간다.
        const net = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
        if (env.VITE_SUI_PACKAGE_ID) configureSui({ network: net, packageId: env.VITE_SUI_PACKAGE_ID })
        return await executeOnchain(
          buildCreateMemoryTx({ weddingId: suiWeddingId, text: textBlobId, photoBlobId }),
        )
      } catch (e) {
        console.error('[memory] onchain failed:', e)
        return null
      }
    },
    [isAuthenticated, address, executeOnchain, loungeId],
  )
}
