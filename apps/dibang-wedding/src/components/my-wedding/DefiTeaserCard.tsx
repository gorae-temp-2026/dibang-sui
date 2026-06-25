// "내 결혼식에 누가 올까" → DeFi 웨딩대출 티저.
// 온체인 신호(credit.ts)에서 신용·예측 수치를 라이브로 표시.
import { useMyCreditStats } from '../../hooks/useCredit'
import { useZkLogin } from '../../providers/ZkLoginProvider'
import { useT } from '../../lib/i18n'

const tierFromScore = (s: number) => s >= 700 ? 'AAA' : s >= 500 ? 'AA' : s >= 300 ? 'A' : s >= 100 ? 'B' : 'C'

export function DefiTeaserCard({ groomName, brideName }: { groomName: string; brideName: string }) {
  const t = useT()
  const won = (n: number) => t('myWedding.defi.money', { v: (n / 10000).toLocaleString() })
  const { address } = useZkLogin()
  const { data: stats } = useMyCreditStats(address ?? undefined)
  const score = stats?.score ?? 0
  const f = {
    moiCredit: score,
    tier: tierFromScore(score),
    expectedGuests: Math.round(score * 0.17),
    expectedGift: Math.round(score * 22000),
    loanLimit: Math.round(score * 14400),
  }
  return (
    <section className="mx-4 mb-8 overflow-hidden rounded-3xl border border-[#E7DFD5] bg-gradient-to-br from-[#FBF7F1] to-[#F1E9DC] shadow-[0_6px_24px_rgba(120,90,50,0.10)]">
      <div className="px-5 pt-5">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8884A]">{t('myWedding.defi.eyebrow')}</div>
        <h2 className="mt-1 text-[20px] font-extrabold text-[#3a2e1e]">{t('myWedding.defi.title')}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#8a7a62]">
          {t('myWedding.defi.lead1', { name: groomName })} <b className="text-[#6a5638]">{groomName}♥{brideName}</b> {t('myWedding.defi.lead2')}
        </p>
      </div>

      {/* 예측 — 하객 / 예상 부조 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 px-5">
        <div className="rounded-2xl border border-[#EADFCD] bg-white/70 p-3.5">
          <div className="text-[11px] text-[#8a7a62]">{t('myWedding.defi.expGuestsLabel')}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <b className="text-[26px] font-black tracking-tight text-[#3a2e1e]">{f.expectedGuests}</b>
            <span className="text-[12px] text-[#8a7a62]">{t('myWedding.defi.guestsUnit')}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#EADFCD] bg-white/70 p-3.5">
          <div className="text-[11px] text-[#8a7a62]">{t('myWedding.defi.expGiftLabel')}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <b className="text-[26px] font-black tracking-tight text-[#3a2e1e]">{won(f.expectedGift)}</b>
          </div>
        </div>
      </div>

      {/* Moi Credit */}
      <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-[#1E3A5F] px-4 py-3 text-white">
        <div className="text-[11px] font-bold text-white/70">{t('myWedding.defi.myCredit')}</div>
        <b className="text-[22px] font-black tracking-tight">{f.moiCredit}</b>
        <span className="rounded-full bg-[#F8C57A] px-2 py-0.5 text-[11px] font-extrabold text-[#5a3a12]">{f.tier}</span>
        <span className="ml-auto text-[10.5px] text-white/55">{t('myWedding.defi.creditObject')}</span>
      </div>

      {/* DeFi 아키텍처 (Sui 네이티브) */}
      <div className="mx-5 mt-3 rounded-2xl border border-[#EADFCD] bg-white/60 p-3.5">
        <div className="text-[11px] font-extrabold text-[#B8884A]">{t('myWedding.defi.archTitle')}</div>
        <div className="mt-2.5 flex items-center justify-between gap-1 text-center">
          {[
            ['Moi Credit', t('myWedding.defi.archMoiSub')],
            ['Navi', t('myWedding.defi.archNaviSub')],
            ['DeepBook', t('myWedding.defi.archDeepbookSub')],
          ].map(([label, sub], i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex-1">
                <div className="text-[12.5px] font-extrabold text-[#3a2e1e]">{label}</div>
                <div className="text-[9.5px] text-[#8a7a62]">{sub}</div>
              </div>
              {i < 2 && <span className="px-0.5 text-[#B8884A]">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 pt-3">
        <button type="button" disabled className="w-full rounded-2xl border border-[#1E3A5F]/25 bg-[#1E3A5F]/5 py-3 text-[13.5px] font-extrabold text-[#1E3A5F]">
          {t('myWedding.defi.cta', { limit: won(f.loanLimit) })} <span className="font-bold text-[#B8884A]">{t('myWedding.defi.roadmap')}</span>
        </button>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#9a8a70]">
          {t('myWedding.defi.disclaimer')}
        </p>
      </div>
    </section>
  )
}
