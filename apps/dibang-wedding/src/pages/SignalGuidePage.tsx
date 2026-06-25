// "시그널이란?" — 앱 수준 설명 페이지(Setting 진입). 프로필에 박혀 있던 fold 상세를 여기로 이전.
// 다크 테마(인연/프로필 viz 재사용). 본문 ko/en 분기, 예시 = 철수 시그널 sunburst.
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useLang, useT } from '../lib/i18n'
import { SignalSunburst } from '../components/profile/SignalSunburst'
import type { SignalNode } from '../components/profile/types'

// 예시 시그널 — Fiske 관계모델(EM·CS·AR·MP) 소분류까지 드릴다운(프로필 sunburst와 동일 구조).
const EXAMPLE_SIGNAL: SignalNode = {
  name: '시그널',
  children: [
    { name: 'EM', children: [{ name: '부조', value: 20 }, { name: '답례', value: 9 }, { name: '선물', value: 6 }] },
    { name: 'CS', children: [{ name: '함께한 자리', value: 12 }, { name: '나눔', value: 7 }, { name: '대화', value: 5 }] },
    { name: 'AR', children: [{ name: '선후배', value: 6 }, { name: '멘토링', value: 4 }] },
    { name: 'MP', children: [{ name: '거래', value: 2, stub: true }] },
  ],
}

function Row({ tag, color, title, body }: { tag: string; color: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
      <span className="mt-0.5 flex h-7 w-9 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold" style={{ background: `${color}22`, color }}>{tag}</span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold text-white">{title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-white/60">{body}</div>
      </div>
    </div>
  )
}

export function SignalGuidePage() {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang()
  const ko = lang === 'ko'
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[480px] bg-[#0A1626] text-[#E8EFF6]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/8 bg-[#0A1626]/92 px-3 py-3 backdrop-blur">
        <button type="button" aria-label={t('page.signalGuide.back')} onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[16px] font-extrabold text-white">{t('settings.guideSignal')}</h1>
      </header>

      <div className="px-5 pb-20 pt-3">
        <p className="text-[14px] font-bold leading-relaxed text-white">
          {ko
            ? '시그널은 두 사람 사이에 실제로 오간 관계 행동의 결이에요.'
            : 'Signal is the texture of the real relationship between two people.'}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">
          {ko
            ? '누가 무엇을 했는지 — 부조·선물·참석·이음·대화 같은 행동이 쌓여 신뢰의 근거가 됩니다.'
            : 'Who did what — gifts, attendance, ieum, and conversations build up into the basis of trust.'}
        </p>

        <div className="my-5 flex flex-col items-center gap-2">
          <SignalSunburst data={EXAMPLE_SIGNAL} size={200} />
          <span className="text-[11px] text-white/45">
            {ko ? '안쪽 = 관계 갈래(EM·CS·AR) · 바깥 = 세부 (예시)' : 'Inner = relation models (EM·CS·AR) · Outer = details (example)'}
          </span>
        </div>

        {/* Fiske 관계모델(Relational Models Theory) — 관계를 운영하는 4가지 방식. */}
        <div className="space-y-2.5">
          <Row tag="CS" color="#5B89B3" title={ko ? '유대 — 공동 공유 (Communal Sharing)' : 'Communal Sharing — bond'} body={ko ? '가족·부부·가까운 공동체처럼 네것내것 없이 나누는 사이.' : 'Family, partners, close community — sharing with no “mine vs yours”.'} />
          <Row tag="AR" color="#B8884A" title={ko ? '위계 — 서열·권위 (Authority Ranking)' : 'Authority Ranking — hierarchy'} body={ko ? '사제·선후배·상하처럼 지위에 기반한 사이.' : 'Mentor–mentee, senior–junior — based on standing.'} />
          <Row tag="EM" color="#D4687A" title={ko ? '호혜 — 동등 맞춤 (Equality Matching)' : 'Equality Matching — reciprocity'} body={ko ? '친구·동창·동료처럼 주고받기 균형을 맞추는 사이. 부조·답례가 여기.' : 'Friends, classmates, peers — balanced give-and-take. Gifts & returns live here.'} />
          <Row tag="MP" color="#9999AD" title={ko ? '거래 — 시장 가격 (Market Pricing)' : 'Market Pricing — trade'} body={ko ? '값을 매겨 교환하는 사이. 상거래·임대·전문가.' : 'Priced exchange — trade, rent, professionals.'} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-[12px] leading-relaxed text-white/60">
          {ko
            ? '🔒 상세 시그널은 이음한 사이에서만 보여요. 이음 전에는 크레딧(좋음/보통)과 이음 수만 보입니다.'
            : '🔒 Detailed signals are visible only between people who have ieum. Before that, you only see credit (Good/Fair) and the number of ieum.'}
        </div>
      </div>
    </div>
  )
}
