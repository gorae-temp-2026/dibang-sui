import { useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { fromPromise } from 'xstate'
import { useQuery } from '@tanstack/react-query'
import { getWeddingOptions } from '@gorae/contracts/@tanstack/react-query.gen'
import { createJsonRpcClient, getWeddingCapForWedding, type SuiNetwork } from '@gorae/sui-sdk'
import { onchainTxMachine } from '../../machines/onchainTx.machine'
import { useOnchainHostActions } from '../../hooks/useOnchainHostActions'
import { useOnchainVault } from '../../hooks/useOnchainWedding'
import { useZkLogin } from '../../providers/ZkLoginProvider'
import { env } from '../../env'
import { useT, translate, useLangStore } from '../../lib/i18n'

const lang = () => useLangStore.getState().lang

const MIST_PER_SUI = 1_000_000_000n

/**
 * 축의금 출금 — 호스트(WeddingCap 보유)가 모금함(CashGiftVault)에서 SUI를 인출(cash_gift::withdraw).
 * 온체인 호출은 onchainTx 머신의 submit actor로 주입(cap을 결혼식별로 찾아 withdraw). sui_vault_id 없으면 안내.
 */
export function WithdrawSection({ weddingId }: { weddingId: string }) {
  const { address, isAuthenticated } = useZkLogin()
  const { withdraw } = useOnchainHostActions()
  // WeddingSummary엔 sui id가 없어 full wedding을 조회해 온체인 금고·결혼식 ID를 얻는다.
  const { data: wedding } = useQuery({ ...getWeddingOptions({ path: { weddingId } }), retry: false })
  const suiWeddingId = wedding?.sui_wedding_id ?? null
  const suiVaultId = wedding?.sui_vault_id ?? null
  const { data: vault } = useOnchainVault(suiVaultId ?? undefined)
  const [amount, setAmount] = useState('')

  const machine = useMemo(
    () =>
      onchainTxMachine.provide({
        actors: {
          submit: fromPromise<string>(async () => {
            if (!suiVaultId || !suiWeddingId) throw new Error(translate(lang(), 'myWedding.withdraw.errNoVault'))
            if (!address) throw new Error(translate(lang(), 'common.errNeedLogin'))
            const sui = parseFloat(amount)
            if (!Number.isFinite(sui) || sui <= 0) throw new Error(translate(lang(), 'myWedding.withdraw.errAmount'))
            const mist = BigInt(Math.round(sui * Number(MIST_PER_SUI)))
            const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
            const client = createJsonRpcClient(network)
            const capId = await getWeddingCapForWedding(client, address, suiWeddingId)
            if (!capId) throw new Error(translate(lang(), 'myWedding.withdraw.errNoCap'))
            return withdraw({ vaultId: suiVaultId, capId, amount: mist })
          }),
        },
      }),
    [suiVaultId, suiWeddingId, address, amount, withdraw],
  )
  const [state, send] = useMachine(machine)
  const t = useT()

  if (!isAuthenticated) return null
  if (!suiVaultId) {
    return <p className="mt-3 text-xs text-muted">{t('myWedding.withdraw.noVault')}</p>
  }

  const busy = state.matches('submitting')
  const balanceSui = vault ? Number(vault.balance) / Number(MIST_PER_SUI) : null
  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-4">
      <p className="text-sm font-semibold text-navy">{t('myWedding.withdraw.title')}</p>
      <p className="mt-1 text-xs text-muted">
        {t('myWedding.withdraw.balance', { bal: balanceSui != null ? `${balanceSui} SUI` : t('myWedding.withdraw.loading') })}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={t('myWedding.withdraw.placeholder')}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => send({ type: 'SUBMIT' })}
          disabled={busy || !amount.trim()}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? t('myWedding.withdraw.withdrawing') : t('myWedding.withdraw.withdraw')}
        </button>
      </div>
      {state.matches('done') && (
        <p className="mt-2 break-all text-xs text-green-600">✅ {t('myWedding.withdraw.done')} · digest {state.context.digest}</p>
      )}
      {state.context.error && state.matches('idle') && (
        <p className="mt-2 text-xs text-red-500">❌ {state.context.error}</p>
      )}
    </div>
  )
}
