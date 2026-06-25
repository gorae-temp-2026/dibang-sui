// Moi Credit 설명 패널 — raw → 2층 fold → 3층 Φ → 4층 통합을 화면으로(공식 뷰).
// 데이터 = sim-scale.mjs 철수 트레이스. 절대값(정확 Moi Credit)은 온체인 오브젝트 맥락에서만 강조.
import type { ProfileData } from './types'
import { useT } from '../../lib/i18n'

function Layer({ tag, value, formula }: { tag: string; value: string; formula: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 w-12 shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white/80">{tag}</span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-white">{value}</div>
        <div className="text-[10px] leading-snug text-white/45">{formula}</div>
      </div>
    </div>
  )
}

export function MoiCreditPanel({ data }: { data: ProfileData }) {
  const t = useT()
  const { trace, moiCredit } = data
  return (
    <div className="space-y-2.5">
      <Layer tag={t('profile.moiCredit.l1Tag')} value={t('profile.moiCredit.l1Value', { gift: trace.L1_raw.부조, ieum: trace.L1_raw.이음, talk: trace.L1_raw.대화, present: trace.L1_raw.선물 })} formula={t('profile.moiCredit.l1Formula')} />
      <Layer tag={t('profile.moiCredit.l2Tag')} value={t('profile.moiCredit.l2Value', { gift: trace.L2_fold.부조EM, present: trace.L2_fold.증여EM })} formula={t('profile.moiCredit.l2Formula')} />
      <Layer tag={t('profile.moiCredit.l3Tag')} value={t('profile.moiCredit.l3Value', { gift: trace.L3_phi.부조, cs: trace.L3_phi.CS, fulfill: trace.L3_phi.이행 })} formula={t('profile.moiCredit.l3Formula')} />
      <Layer tag={t('profile.moiCredit.l4Tag')} value={`${trace.L4_integrate.value}`} formula={`MoiCredit = ${trace.L4_integrate.formula}`} />

      <div className="rounded-xl border border-[#F8C57A]/40 bg-white/[0.05] p-2.5">
        <div className="text-[12px] font-extrabold text-[#F8C57A]">🪙 {t('profile.moiCredit.onchainLabel')} {moiCredit.score}/1000 · {moiCredit.tier}</div>
        <div className="mt-1 text-[10.5px] leading-relaxed text-white/55">
          {t('profile.moiCredit.absPre')} <b className="text-white/80">{t('profile.moiCredit.absBold')}</b>{t('profile.moiCredit.absPost')} {t('profile.moiCredit.rank', { total: moiCredit.total, rank: moiCredit.rank })}
        </div>
      </div>
    </div>
  )
}
