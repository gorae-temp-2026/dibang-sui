// 게스트 온체인 액션 훅 (guest-web).
// [변경 2026-06-21] guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다(CLAUDE.md §2).
// 게스트가 본인 zkLogin 지갑으로 participate/give/write/rsvp를 직접 서명.
import { useCallback } from 'react'
import {
  buildSubmitRsvpTx,
  buildParticipateTx,
  buildGiveTx,
  buildWriteTx,
  type ParticipateParams,
  type GiveParams,
  type WriteParams,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'

export interface SubmitRsvpInput {
  loungeId: string
  /** u8(§1-6): groom=0·bride=1·groom_father=2·groom_mother=3·bride_father=4·bride_mother=5. */
  recipientSlot: number
  /** u8: attending=0, absent=1. */
  attendance: number
  companionCount: number
  /** u8: yes=0, no=1, undecided=2. */
  meal: number
}

export function useOnchainActions() {
  const { executeOnchain } = useZkLogin()

  const submitRsvp = useCallback(
    async (input: SubmitRsvpInput): Promise<string> => executeOnchain(buildSubmitRsvpTx(input)),
    [executeOnchain],
  )

  const participate = useCallback(
    async (params: ParticipateParams): Promise<string> => executeOnchain(buildParticipateTx(params)),
    [executeOnchain],
  )

  const give = useCallback(
    async (params: GiveParams): Promise<string> => executeOnchain(buildGiveTx(params)),
    [executeOnchain],
  )

  const write = useCallback(
    async (params: WriteParams): Promise<string> => executeOnchain(buildWriteTx(params)),
    [executeOnchain],
  )

  return { submitRsvp, participate, give, write }
}
