import { useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { fromPromise } from 'xstate'
import { useQuery } from '@tanstack/react-query'
import { getWeddingOptions } from '@gorae/contracts/@tanstack/react-query.gen'
import { createJsonRpcClient, getWeddingCapForWedding, type SuiNetwork } from '@gorae/sui-sdk'
import { addHostMachine } from '../../machines/addHost.machine'
import { useOnchainHostActions } from '../../hooks/useOnchainHostActions'
import { useZkLogin } from '../../providers/ZkLoginProvider'
import { env } from '../../env'
import { useT, translate, useLangStore } from '../../lib/i18n'

const lang = () => useLangStore.getState().lang

/**
 * 공동 혼주 추가 — primary host가 상대 Sui 주소로 WeddingCap(수정·인출 권한)을 발행한다(wedding::add_host).
 * 머신(addHost)은 flow만, 온체인 호출은 여기서 submit actor로 주입(cap을 결혼식별로 찾아 addHost).
 * sui_wedding_id가 없으면(온체인 미생성) 추가 불가 안내.
 */
export function AddHostSection({ weddingId }: { weddingId: string }) {
  const { address, isAuthenticated } = useZkLogin()
  const { addHost } = useOnchainHostActions()
  const [newHost, setNewHost] = useState('')
  // WeddingSummary엔 sui_wedding_id가 없어 full wedding을 조회해 온체인 ID를 얻는다.
  const { data: wedding } = useQuery({ ...getWeddingOptions({ path: { weddingId } }), retry: false })
  const suiWeddingId = wedding?.sui_wedding_id ?? null

  const machine = useMemo(
    () =>
      addHostMachine.provide({
        actors: {
          submit: fromPromise<string, { newHost: string }>(async ({ input }) => {
            if (!suiWeddingId) throw new Error(translate(lang(), 'myWedding.addHost.errNoOnchain'))
            if (!address) throw new Error(translate(lang(), 'common.errNeedLogin'))
            const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
            const client = createJsonRpcClient(network)
            const capId = await getWeddingCapForWedding(client, address, suiWeddingId)
            if (!capId) throw new Error(translate(lang(), 'myWedding.addHost.errNoCap'))
            return addHost({ weddingId: suiWeddingId, capId, newHost: input.newHost.trim() })
          }),
        },
      }),
    [suiWeddingId, address, addHost],
  )
  const [state, send] = useMachine(machine)
  const t = useT()

  if (!isAuthenticated) return null
  if (!suiWeddingId) {
    return <p className="mt-3 text-xs text-muted">{t('myWedding.addHost.notYetOnchain')}</p>
  }

  const busy = state.matches('submitting')
  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-4">
      <p className="text-sm font-semibold text-navy">{t('myWedding.addHost.title')}</p>
      <p className="mt-1 text-xs text-muted">{t('myWedding.addHost.desc')}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={newHost}
          onChange={(e) => setNewHost(e.target.value)}
          placeholder={t('myWedding.addHost.placeholder')}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => send({ type: 'SUBMIT', newHost })}
          disabled={busy || !newHost.trim()}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? t('myWedding.addHost.adding') : t('myWedding.addHost.add')}
        </button>
      </div>
      {state.matches('done') && (
        <p className="mt-2 break-all text-xs text-green-600">✅ {t('myWedding.addHost.done')} · digest {state.context.digest}</p>
      )}
      {state.context.error && state.matches('idle') && (
        <p className="mt-2 text-xs text-red-500">❌ {state.context.error}</p>
      )}
    </div>
  )
}
