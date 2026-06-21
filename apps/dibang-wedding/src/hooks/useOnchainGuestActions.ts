/**
 * 게스트 온체인 액션 훅 (dibang-wedding 로그인 본체).
 *
 * 부조(give)·방명록(write)은 하객 Participation(온체인 신원, 참가-먼저)을 요구한다.
 * guest-web은 비로그인 익명 퍼널(§2)이라 온체인 give/write를 거기서 하지 않고
 * 로그인 본체(이 앱)에서 처리한다 (cutover 2026-06-21 결정).
 *
 * 흐름: participate(이벤트 참가 → Participation 획득) → give/write(Participation으로 서명).
 */
import { useCallback } from 'react'
import {
  buildParticipateTx,
  buildGiveTx,
  buildWriteTx,
  type ParticipateParams,
  type GiveParams,
  type WriteParams,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'

export function useOnchainGuestActions() {
  const { executeOnchain } = useZkLogin()

  const participate = useCallback(
    (p: ParticipateParams) => executeOnchain(buildParticipateTx(p)),
    [executeOnchain],
  )

  const give = useCallback(
    (p: GiveParams) => executeOnchain(buildGiveTx(p)),
    [executeOnchain],
  )

  const write = useCallback(
    (p: WriteParams) => executeOnchain(buildWriteTx(p)),
    [executeOnchain],
  )

  return { participate, give, write }
}
