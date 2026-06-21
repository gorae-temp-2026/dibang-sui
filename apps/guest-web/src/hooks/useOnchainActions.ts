// ⚠️ TRANSITIONAL(전환기) — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB(Go/Supabase)는 보조.
// 상세: CLAUDE.md 상단 SSOT 배너 / _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언.
/**
 * 게스트 온체인 액션 훅 (RSVP 한정).
 *
 * cutover(2026-06-21): 새 컨트랙트의 부조(give)·방명록(write)은 하객 *Participation*(온체인 신원, 참가-먼저)을
 * 요구한다. guest-web은 §2(비로그인 익명 전환 퍼널)라 그 흐름이 없으므로 **온체인 give/write를 여기서 하지 않는다**
 * — 로그인 본체(dibang-wedding)에서 Participation을 갖고 수행한다. RSVP는 이벤트 발행만이라(participation 불요)
 * 여기 유지한다. (단 guest-web이 zkLogin/executeOnchain을 갖는 것 자체의 §2 정합은 별도 과제 — _audit/2026-06-21-sdk-contract-drift.)
 */
import { useCallback } from 'react'
import { buildSubmitRsvpTx } from '@gorae/sui-sdk'
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
    // RSVP는 이벤트만 발행(오브젝트·participation 불요).
    async (input: SubmitRsvpInput): Promise<string> => executeOnchain(buildSubmitRsvpTx(input)),
    [executeOnchain],
  )

  return { submitRsvp }
}
