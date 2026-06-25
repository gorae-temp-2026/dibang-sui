// 요네 충전(Sui) — 설정에서 진입. UI·플로우·잔액(mock)만; 실제 온체인 결제·zkLogin은 TODO 스텁.
// 충전분은 giftActor(전역 요네 지갑 — 선물 송신·광장 수신 아이템과 공유)에 CHARGE로 적립 → 기존 요네 이코노미와 연결.
// 플로우: connect(zkLogin 연결) → select(패키지 선택) → paying(mock tx) → done(요네 적립).
import { useState } from 'react'
import { useSelector } from '@xstate/react'
import { Coins, Wallet, Check, Loader2, ShieldCheck } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import { giftActor } from '../../machines/gift.machine'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

const SUI_BLUE = '#4DA2FF'
const GOLD = '#F8C57A'

interface Pkg {
  yone: number
  sui: number
  popular?: boolean
}
// 데모 환율 — 1,000 요네 ≈ 1 SUI.
const PACKAGES: Pkg[] = [
  { yone: 500, sui: 0.5 },
  { yone: 1000, sui: 1, popular: true },
  { yone: 3000, sui: 3 },
  { yone: 5000, sui: 5 },
]

type Step = 'connect' | 'select' | 'paying' | 'done'

function SuiMark({ className }: { className?: string }) {
  // Sui 드롭릿(데모용 단순 마크).
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2.5c3.6 4.7 6.5 7.9 6.5 11.6A6.5 6.5 0 0 1 5.5 14.1C5.5 10.4 8.4 7.2 12 2.5Z" fill={SUI_BLUE} />
    </svg>
  )
}

export function YoneChargeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT()
  const yone = useSelector(giftActor, (s) => s.context.yone)
  const [step, setStep] = useState<Step>('connect')
  const [addr, setAddr] = useState<string | null>(null)
  const [picked, setPicked] = useState<Pkg | null>(null)

  const reset = () => {
    setStep('connect')
    setAddr(null)
    setPicked(null)
  }

  // 지갑/zkLogin 연결 — TODO: @mysten/dapp-kit + Enoki zkLogin(구글). 데모는 mock 주소.
  const connect = () => {
    setAddr('0x7a3f…d92c')
    setStep('select')
  }

  // 결제 확정 — TODO: SUI 트랜잭션 빌드·서명·확인. 데모는 지연 후 요네 적립(giftActor.CHARGE).
  const pay = () => {
    if (!picked) return
    setStep('paying')
    setTimeout(() => {
      giftActor.send({ type: 'CHARGE', amount: picked.yone })
      setStep('done')
    }, 1300)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setTimeout(reset, 250) // 닫힘 애니메이션 후 초기화
      }}
    >
      <SheetContent side="bottom" className="max-h-[88vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SuiMark className="h-5 w-5" /> {t('settings.charge')}
          </SheetTitle>
          <SheetDescription>{t('settings.yoneCharge.desc')}</SheetDescription>
        </SheetHeader>

        {/* 현재 잔액(전역 요네 지갑) */}
        <div
          className="mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: `${GOLD}4d`, background: `linear-gradient(135deg, ${GOLD}24, transparent)` }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ background: `${GOLD}33` }}>
            🐚
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/45">My Yone</div>
            <div className="flex items-baseline gap-1 text-white">
              <b className="text-[22px] font-black tracking-tight">{yone.toLocaleString()}</b>
              <span className="text-[11px] text-white/55">{t('settings.yoneUnit')}</span>
            </div>
          </div>
        </div>

        {step === 'connect' && (
          <div>
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-white">
                <Wallet className="h-4 w-4" style={{ color: SUI_BLUE }} /> {t('settings.yoneCharge.connectTitle')}
              </div>
              <p className="text-[12px] leading-relaxed text-white/55">
                {t('settings.yoneCharge.connectDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={connect}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[14px] font-extrabold text-white"
              style={{ background: `linear-gradient(135deg, ${SUI_BLUE}, #2f7fe0)` }}
            >
              <SuiMark className="h-4 w-4 brightness-0 invert" /> {t('settings.yoneCharge.connectBtn')}
            </button>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" /> {t('settings.yoneCharge.demoNote1')}
            </p>
          </div>
        )}

        {step === 'select' && (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px]">
              <span className="h-2 w-2 rounded-full" style={{ background: '#46d18a' }} />
              <span className="text-white/70">{t('settings.yoneCharge.connected')}</span>
              <span className="ml-auto font-mono text-white/45">{addr}</span>
            </div>
            <div className="mb-2 text-[12px] font-bold text-white/70">{t('settings.yoneCharge.packages')}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {PACKAGES.map((p) => {
                const on = picked?.yone === p.yone
                return (
                  <button
                    key={p.yone}
                    type="button"
                    onClick={() => setPicked(p)}
                    className={cn(
                      'relative rounded-2xl border p-3.5 text-left transition',
                      on ? 'border-transparent' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                    )}
                    style={on ? { background: `linear-gradient(135deg, ${GOLD}26, transparent)`, boxShadow: `inset 0 0 0 1.5px ${GOLD}` } : undefined}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold text-[#5a3a12]" style={{ background: GOLD }}>
                        {t('settings.yoneCharge.popular')}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-white">
                      <Coins className="h-4 w-4" style={{ color: GOLD }} />
                      <b className="text-[18px] font-black">{p.yone.toLocaleString()}</b>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/45">{t('settings.yoneUnit')}</div>
                    <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold" style={{ color: SUI_BLUE }}>
                      <SuiMark className="h-3.5 w-3.5" /> ≈ {p.sui} SUI
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              disabled={!picked}
              onClick={pay}
              className="mt-4 w-full rounded-2xl px-4 py-3.5 text-[14px] font-extrabold text-white transition disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${SUI_BLUE}, #2f7fe0)` }}
            >
              {picked ? t('settings.yoneCharge.payBtn', { sui: picked.sui, yone: picked.yone.toLocaleString() }) : t('settings.yoneCharge.pickPackage')}
            </button>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" /> {t('settings.yoneCharge.demoNote2')}
            </p>
          </div>
        )}

        {step === 'paying' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-4 h-9 w-9 animate-spin" style={{ color: SUI_BLUE }} />
            <div className="text-[14px] font-bold text-white">{t('settings.yoneCharge.paying')}</div>
            <div className="mt-1 text-[12px] text-white/45">{t('settings.yoneCharge.payingSub')}</div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: '#46d18a22' }}>
              <Check className="h-7 w-7" style={{ color: '#46d18a' }} />
            </div>
            <div className="text-[16px] font-extrabold text-white">{t('settings.yoneCharge.doneTitle', { yone: picked?.yone.toLocaleString() ?? '' })}</div>
            <div className="mt-1 text-[12px] text-white/50">{t('settings.yoneCharge.doneBalance', { yone: yone.toLocaleString() })}</div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 w-full rounded-2xl bg-white/10 px-4 py-3.5 text-[14px] font-bold text-white transition hover:bg-white/15"
            >
              {t('common.done')}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
