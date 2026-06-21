// "시그널이란?" — 앱 수준 설명 페이지(Setting 진입). 프로필에 박혀 있던 fold 상세를 여기로 이전.
// 다크 테마(인연/프로필 viz 재사용). 본문 ko/en 분기, 예시 = 철수 시그널 sunburst.
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useLang, useT } from '../lib/i18n'
import { SignalSunburst } from '../components/profile/SignalSunburst'
import { chulsooPlazaProfile } from '../components/profile/personaProfiles'

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
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
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
          <SignalSunburst data={chulsooPlazaProfile.signal} size={200} />
          <span className="text-[11px] text-white/45">
            {ko ? '안쪽 = 큰 갈래 · 바깥 = 세부 (예시)' : 'Inner = main branches · Outer = details (example)'}
          </span>
        </div>

        <div className="space-y-2.5">
          <Row tag="EM" color="#D4687A" title={ko ? '경제 — 마음을 담아 건넨 것' : 'Economy — given with heart'} body={ko ? '부조·선물처럼 실제로 건넨 호의.' : 'Real generosity such as gifts and cash gifts.'} />
          <Row tag="CS" color="#5B89B3" title={ko ? '사회 — 함께한 것' : 'Social — shared moments'} body={ko ? '같은 자리에 참석하고, 이음하고, 대화한 흐름.' : 'Attending together, making ieum, and talking.'} />
          <Row tag="AR" color="#B8884A" title={ko ? '관계 — 어떤 사이인지' : 'Relation — how you relate'} body={ko ? '관계의 종류와 맥락(표시).' : 'The kind and context of the relationship (shown).'} />
          <Row tag="MP" color="#9999AD" title={ko ? '거래 — 준비 중' : 'Market — coming soon'} body={ko ? '거래 기반 신호(스텁).' : 'Trade-based signals (stub).'} />
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
