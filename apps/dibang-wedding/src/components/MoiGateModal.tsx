import { useEffect, useMemo } from 'react'
import { useMachine } from '@xstate/react'
import { fromPromise } from 'xstate'
import { useQuery } from '@tanstack/react-query'
import { createJsonRpcClient, getOwnedMoiIds, type SuiNetwork } from '@gorae/sui-sdk'
import { moiGateMachine } from '../machines/moiGate.machine'
import { useOnchainHostActions } from '../hooks/useOnchainHostActions'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'
import { useT } from '../lib/i18n'

/**
 * Moi(아바타) 강제 생성 게이트 모달 — Moi가 꼭 필요한 기능(인연 등) 진입 시 마운트한다.
 * 로그인했는데 온체인 Moi가 없으면 **닫을 수 없는** 모달로 생성을 강제한다(만들어야 빠져나감).
 * flow는 moiGate 머신, 온체인 createMoi는 submit actor 주입, 보유 여부는 React Query(머신 밖).
 */
export function MoiGateModal() {
  const { address, isAuthenticated } = useZkLogin()
  const { createMoi } = useOnchainHostActions()
  const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'

  const { data: moiIds, refetch } = useQuery({
    queryKey: ['ownedMoi', address],
    queryFn: () => getOwnedMoiIds(createJsonRpcClient(network), address!),
    enabled: isAuthenticated && !!address,
  })

  const machine = useMemo(
    () =>
      moiGateMachine.provide({
        actors: {
          submit: fromPromise<string>(async () => {
            const digest = await createMoi()
            await refetch() // 생성 후 보유로 갱신 → 더는 게이트 안 걸림.
            return digest
          }),
        },
      }),
    [createMoi, refetch],
  )
  const [state, send] = useMachine(machine)
  const t = useT()

  const hasMoi = (moiIds?.length ?? 0) > 0
  const queryDone = moiIds !== undefined
  useEffect(() => {
    if (isAuthenticated && queryDone && !hasMoi && state.matches('hidden')) {
      send({ type: 'REQUIRE' })
    }
  }, [isAuthenticated, queryDone, hasMoi, state, send])

  if (!state.matches('visible') && !state.matches('submitting')) return null
  const busy = state.matches('submitting')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-lg font-bold text-navy">{t('myWedding.moiGate.title')}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t('myWedding.moiGate.desc')}
        </p>
        <button
          type="button"
          onClick={() => send({ type: 'SUBMIT' })}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-navy px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('myWedding.moiGate.creating') : t('myWedding.moiGate.create')}
        </button>
        {state.context.error && (
          <p className="mt-2 text-xs text-red-500">❌ {state.context.error}</p>
        )}
        {/* 닫기 버튼 없음 — 강제(만들어야 진행). */}
      </div>
    </div>
  )
}
