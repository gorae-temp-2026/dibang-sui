// Moi Credit 설명 패널 — raw → 2층 fold → 3층 Φ → 4층 통합을 화면으로(공식 뷰).
// 데이터 = sim-scale.mjs 철수 트레이스. 절대값(정확 Moi Credit)은 온체인 오브젝트 맥락에서만 강조.
import type { ProfileData } from './types'

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
  const { trace, moiCredit } = data
  return (
    <div className="space-y-2.5">
      <Layer tag="1층 raw" value={`부조 ${trace.L1_raw.부조} · 이음 ${trace.L1_raw.이음} · 대화 ${trace.L1_raw.대화} · 선물 ${trace.L1_raw.선물}`} formula="event·action·role → 1층 신호 레코드" />
      <Layer tag="2층 fold" value={`부조 ${trace.L2_fold.부조EM}만 · 증여 ${trace.L2_fold.증여EM}`} formula="Σ 신호 → EM·CS 원장 (신뢰잔액 = 엣지 상대값)" />
      <Layer tag="3층 Φ" value={`부조 ${trace.L3_phi.부조} · CS ${trace.L3_phi.CS} · 이행 ${trace.L3_phi.이행}`} formula="정규화 + reversed-giving PageRank / authority / node (EigenTrust 계보, d=0.85)" />
      <Layer tag="4층 통합" value={`${trace.L4_integrate.value}`} formula={`MoiCredit = ${trace.L4_integrate.formula}`} />

      <div className="rounded-xl border border-[#F8C57A]/40 bg-white/[0.05] p-2.5">
        <div className="text-[12px] font-extrabold text-[#F8C57A]">🪙 Moi Credit (온체인) {moiCredit.score}/1000 · {moiCredit.tier}</div>
        <div className="mt-1 text-[10.5px] leading-relaxed text-white/55">
          절대값 = 노드 신용. <b className="text-white/80">정확값은 프로필 밖 = 온체인 composable 오브젝트</b>(소비자가 정체 모른 채 read). 전체 {moiCredit.total}명 중 {moiCredit.rank}위.
        </div>
      </div>
    </div>
  )
}
