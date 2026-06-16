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
  guestName: string
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
