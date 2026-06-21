// ⚠️ TRANSITIONAL(전환기) — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB(Go/Supabase)는 보조.
// 게스트 온체인 쓰기를 DB 흐름과 dual-write하는 건 *전환기*일 뿐 "DB 우선" 아님. 목표(미완): 앱 온체인-읽기 이관.
// 상세: CLAUDE.md 상단 SSOT 배너 / _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언.
/**
 * 게스트 온체인 액션 훅.
 *
 * 기존 Supabase/API 흐름을 온체인으로 전환하는 진입점. 각 액션은 @gorae/sui-sdk 빌더로
 * PTB를 만들고, ZkLoginProvider.executeOnchain(zkLogin 서명 + sponsor 가스 대납)으로 실행한다.
 * 하객은 지갑·SUI 없이 Google 로그인만으로 온체인에 기록한다.
 */
import { useCallback } from 'react'
import { buildWriteEntryTx, buildSendGiftTx, buildSubmitRsvpTx } from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'

export interface WriteGuestbookInput {
  loungeId: string
  guestName: string
  message: string
}

export interface SendCashGiftInput {
  vaultId: string
  /** MIST 단위. */
  amount: bigint
  guestName: string
  recipientSlot: string
  relationCategory: string
}

export interface SubmitRsvpInput {
  loungeId: string
  recipientSlot: string
  attendance: string
  companionCount: number
  meal: string
}

export function useOnchainActions() {
  const { address, executeOnchain } = useZkLogin()

  const writeGuestbook = useCallback(
    async (input: WriteGuestbookInput): Promise<string> => {
      if (!address) throw new Error('zkLogin 로그인이 필요합니다')
      return executeOnchain(buildWriteEntryTx({ ...input, owner: address }))
    },
    [address, executeOnchain],
  )

  const sendCashGift = useCallback(
    async (input: SendCashGiftInput): Promise<string> => {
      if (!address) throw new Error('zkLogin 로그인이 필요합니다')
      return executeOnchain(buildSendGiftTx({ ...input, owner: address }))
    },
    [address, executeOnchain],
  )

  const submitRsvp = useCallback(
    async (input: SubmitRsvpInput): Promise<string> => {
      // RSVP는 이벤트만 발행(오브젝트 없음) — owner 불필요.
      return executeOnchain(buildSubmitRsvpTx(input))
    },
    [executeOnchain],
  )

  return { writeGuestbook, sendCashGift, submitRsvp }
}
