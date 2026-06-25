// "모이크레딧이란?" — 앱 수준 설명 페이지(Setting 진입). 프로필에 박혀 있던 Moi Credit
// 산출공식(raw→fold→Φ→통합)을 여기로 이전. 다크 테마. 예시 = 철수 트레이스(MoiCreditPanel).
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useLang, useT } from '../lib/i18n'
import { MoiCreditPanel } from '../components/profile/MoiCreditPanel'
import { chulsooPlazaProfile } from '../components/profile/personaProfiles'

// 1층 raw 튜플 — [Event_type, Action_type, Role1 → Role2] 한 줄.
function TupleRow({ tag, action, from, to }: { tag: string; action: string; from: string; to: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="rounded bg-[#F8C57A]/15 px-1.5 py-0.5 text-[10.5px] font-extrabold text-[#F8C57A]">{tag}</span>
        <span className="text-[12.5px] font-bold text-white">{action}</span>
      </div>
      <div className="mt-1 text-[11.5px] text-white/55">
        {from} <span className="text-white/30">→</span> {to}
      </div>
    </div>
  )
}

function Layer({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F8C57A]/15 text-[12px] font-extrabold text-[#F8C57A]">{n}</span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold text-white">{title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-white/60">{body}</div>
      </div>
    </div>
  )
}

export function MoiCreditGuidePage() {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang()
  const ko = lang === 'ko'
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[480px] bg-[#0A1626] text-[#E8EFF6]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/8 bg-[#0A1626]/92 px-3 py-3 backdrop-blur">
        <button type="button" aria-label={ko ? '뒤로' : 'Back'} onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[16px] font-extrabold text-white">{t('settings.guideCredit')}</h1>
      </header>

      <div className="px-5 pb-20 pt-3">
        <p className="text-[14px] font-bold leading-relaxed text-white">
          {ko ? '모이크레딧은 관계 행동으로 쌓인 신용이에요.' : 'Moi Credit is credit built from relationship behavior.'}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">
          {ko
            ? '“누군지 몰라도, 어떻게 살아왔는지”로 신뢰를 읽습니다. 시그널이 모여 한 점수가 돼요.'
            : '“We may not know who you are, but we know how you’ve lived.” Signals add up into one score.'}
        </p>

        {/* 1층 raw — 행동 한 줄(튜플)이 출발점 */}
        <div className="mb-2 mt-5 text-[12.5px] font-bold text-white/80">{ko ? '1층 raw — 행동 한 줄 [이벤트·행동·역할→역할]' : 'Layer 1 raw — one action [event · action · role → role]'}</div>
        <div className="space-y-2">
          <TupleRow tag={ko ? '결혼식' : 'Wedding'} action={ko ? '부조 · 축의 20만원' : 'Gift · ₩200,000'} from={ko ? '하객 민수' : 'Guest Minsu'} to={ko ? '혼주 철수' : 'Host Chulsoo'} />
          <TupleRow tag={ko ? '디방인연' : 'dibang inyeon'} action={ko ? '선물 · 샵' : 'Present · shop'} from={ko ? '보낸이 철수' : 'From Chulsoo'} to={ko ? '받는이 영희' : 'To Younghee'} />
        </div>
        <p className="my-2 text-center text-[16px] text-white/30">↓</p>

        <div className="mb-5 space-y-3.5">
          <Layer n="1" title={ko ? 'raw — 행동 기록' : 'raw — behavior log'} body={ko ? '위 같은 행동 한 줄들이 1층 신호로 기록돼요(부조·이음·대화·선물).' : 'Action rows like the above are recorded as layer-1 signals (gifts, ieum, talk, presents).'} />
          <Layer n="2" title={ko ? 'fold — 원장으로 접기' : 'fold — into ledgers'} body={ko ? '행동을 호혜(EM)·유대(CS) 원장으로 모아요(부조·답례=EM, 함께함·나눔=CS).' : 'Actions fold into reciprocity (EM) and communal (CS) ledgers.'} />
          <Layer n="3" title={ko ? 'Φ — 관계망 위치' : 'Φ — position in the network'} body={ko ? '받은 마음이 다시 흐르는 구조로 관계망 위치를 정규화해요(reversed-giving PageRank · EigenTrust 계보).' : 'Your position is normalized by how given trust flows back (reversed-giving PageRank, in the EigenTrust lineage).'} />
          <Layer n="4" title={ko ? '통합 — 한 점수' : 'integrate — one score'} body={ko ? '0.5·부조 + 0.3·CS + 0.2·이행으로 합쳐 모이크레딧이 됩니다.' : '0.5·gift + 0.3·CS + 0.2·fulfillment combine into Moi Credit.'} />
        </div>

        {/* 예시 — 철수의 실제 산출 트레이스 */}
        <div className="mb-2 text-[12.5px] font-bold text-white/80">{ko ? '예시 — 철수의 산출' : 'Example — Chulsoo’s trace'}</div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
          <MoiCreditPanel data={chulsooPlazaProfile} />
        </div>

        <div className="mt-4 rounded-2xl border border-[#F8C57A]/30 bg-[#F8C57A]/10 p-3.5 text-[12px] leading-relaxed text-white/70">
          {ko
            ? '앱에선 크레딧을 좋음/보통 같은 정성 표현으로만 보여줘요. 정확한 수치는 온체인 신용 오브젝트로만 read돼, 다른 서비스가 정체를 몰라도 신용만 확인할 수 있어요(예: DeFi 웨딩 대출).'
            : 'In-app, credit shows only as qualitative labels like Good/Fair. The exact value is read only as an on-chain credit object — others can verify your credit without knowing who you are (e.g. a DeFi wedding loan).'}
        </div>
      </div>
    </div>
  )
}
