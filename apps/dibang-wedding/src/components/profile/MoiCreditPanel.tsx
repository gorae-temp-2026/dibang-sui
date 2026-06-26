// Moi Credit 설명 패널 — raw → 2층 fold → 3층 Φ → 4층 통합(공식 뷰). i18n ko/en.
// 데이터 = sim-scale.mjs 철수 트레이스. 절대값(정확 Moi Credit)은 온체인 오브젝트 맥락에서만 강조.
import type { ProfileData } from './types'
import { useT, useLang } from '../../lib/i18n'

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
  const ko = useLang() === 'ko'
  return (
    <div className="space-y-2.5">
      <Layer
        tag={ko ? '1층 raw' : 'L1 · raw'}
        value={ko ? `부조 ${trace.L1_raw.부조} · 이음 ${trace.L1_raw.이음} · 대화 ${trace.L1_raw.대화} · 선물 ${trace.L1_raw.선물}` : `gifts ${trace.L1_raw.부조} · ieum ${trace.L1_raw.이음} · talks ${trace.L1_raw.대화} · presents ${trace.L1_raw.선물}`}
        formula={ko ? 'event·action·role → 1층 신호 레코드' : 'event-action-role → layer-1 signal records'}
      />
      <Layer
        tag={ko ? '2층 fold' : 'L2 · fold'}
        value={ko ? `부조 ${trace.L2_fold.부조EM}만 · 증여 ${trace.L2_fold.증여EM}` : `gift money ₩${trace.L2_fold.부조EM}0K · presents ${trace.L2_fold.증여EM}`}
        formula={ko ? 'Σ 신호 → EM·CS 원장 (신뢰잔액 = 엣지 상대값)' : 'Σ signals = EM·CS ledgers (trust balance = relative edge value)'}
      />
      <Layer
        tag={ko ? '3층 Φ' : 'L3 · Φ'}
        value={ko ? `부조 ${trace.L3_phi.부조} · CS ${trace.L3_phi.CS} · 이행 ${trace.L3_phi.이행}` : `gift ${trace.L3_phi.부조} · CS ${trace.L3_phi.CS} · fulfillment ${trace.L3_phi.이행}`}
        formula={ko ? '정규화 + reversed-giving PageRank / authority / node (EigenTrust 계보, d=0.85)' : 'normalize + reversed-giving PageRank (node authority, EigenTrust lineage, d=0.85)'}
      />
      <Layer
        tag={ko ? '4층 통합' : 'L4 · integrate'}
        value={`${trace.L4_integrate.value}`}
        formula={ko ? `MoiCredit = ${trace.L4_integrate.formula}` : 'MoiCredit = 0.5·gift + 0.3·CS + 0.2·fulfillment'}
      />

      <div className="rounded-xl border border-[#F8C57A]/40 bg-white/[0.05] p-2.5">
        <div className="text-[12px] font-extrabold text-[#F8C57A]">🪙 Moi Credit {ko ? '(온체인)' : '(on-chain)'} {moiCredit.score}/1000 · {moiCredit.tier}</div>
        <div className="mt-1 text-[10.5px] leading-relaxed text-white/55">
          {ko ? (
            <>
              절대값 = 노드 신용. <b className="text-white/80">정확값은 프로필 밖 = 온체인 composable 오브젝트</b>(소비자가 정체 모른 채 read). 전체 {moiCredit.total}명 중 {moiCredit.rank}위.
            </>
          ) : (
            <>
              absolute node credit; the exact value lives outside the app as an on-chain composable object that consumers read without knowing who you are. Rank {moiCredit.rank}th of {moiCredit.total}.
            </>
          )}
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 text-[10.5px] leading-relaxed text-white/55">
          {ko
            ? "Moi Credit은 고정값이 아니에요. 신뢰 네트워크 속 '내 위치'라 사람이 늘고 관계가 생기면 시간에 따라 계속 변해요 — 주식처럼. 정확한 현재 값은 항상 온체인에 있어요."
            : "Moi Credit isn't fixed. It's your position in a living trust network, so it shifts over time as people join and interact — like a stock price. The current exact value always lives on-chain."}
        </div>
      </div>
    </div>
  )
}
