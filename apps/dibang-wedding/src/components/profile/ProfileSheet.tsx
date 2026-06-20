// 공유 프로필 시트 — 디방인연(①②) · 모이가모인곳/라운지(③) 공용 (핸드오프 §6·§13).
// 3요소: ① 인연 연결(force-graph) + ② 우리 signal(2D sunburst) + 익명 신뢰범위.
// + Moi Credit 설명 패널(raw→층→공식). ★ Moi Credit 정확값은 프로필 밖 = 온체인.
// 공개범위 context prop으로 ①②(인연 익명) / ③(라운지 전체공개) 분기.
import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import type { ProfileContext, ProfileData } from './types'
import { InyeonGraph } from './InyeonGraph'
import { SignalSunburst } from './SignalSunburst'
import { TrustRange } from './TrustRange'
import { MoiCreditPanel } from './MoiCreditPanel'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 text-[13px] font-bold text-white">{title}</h3>
      {children}
    </section>
  )
}

interface ProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ProfileData
  /** 공개 범위: inyeon(①② 온라인·익명) / lounge(③ 오프라인·전체공개). */
  context?: ProfileContext
  /** 이음 신청 CTA(인연 ①②). 미지정 시 버튼 숨김. */
  onIeum?: () => void
}

export function ProfileSheet({ open, onOpenChange, data, context = 'inyeon', onIeum }: ProfileSheetProps) {
  const offline = context === 'lounge' // ③ 오프라인 이음 = 이름·소속·전체 네트워크 공개
  const name = offline ? data.subject : '익명 모이'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>{name} · 프로필</SheetTitle>
        </SheetHeader>
        <p className="-mt-1 mb-3 text-[11px] leading-relaxed text-white/50">
          {offline
            ? '라운지(오프라인 이음 ③) — 이름·소속·전체 신뢰네트워크 공개'
            : '디방인연(온라인 ①②) — 이음 전엔 익명: 연결 모양·신뢰 범위만'}
        </p>

        <Section title="① 인연 연결">
          <InyeonGraph data={data} size={250} />
          <p className="mt-1.5 text-[10px] text-white/40">
            {offline ? '실명 네트워크' : '누구와 이음됐는지 (익명)'} · 강한 이웃 {data.graph.nodes.length - 1}명
          </p>
        </Section>

        <Section title="② 우리 signal (2층 fold)">
          <div className="flex items-center gap-3">
            <SignalSunburst data={data.signal} size={168} />
            <ul className="space-y-1 text-[11px] text-white/70">
              <li><b className="text-[#D4687A]">EM</b> 부조·증여 (실값)</li>
              <li><b className="text-[#5B89B3]">CS</b> 참석·이음·대화 (실값)</li>
              <li><b className="text-[#B8884A]">AR</b> 관계 (표시만)</li>
              <li><b className="text-[#9999AD]">MP</b> 거래 (스텁)</li>
            </ul>
          </div>
        </Section>

        <Section title="익명 신뢰범위">
          <TrustRange trust={data.trustRange} />
        </Section>

        <Section title="Moi Credit — raw → 층 → 공식">
          <MoiCreditPanel data={data} />
        </Section>

        {onIeum && !offline && (
          <button
            type="button"
            onClick={onIeum}
            className="mt-1 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
          >
            이음 신청하기
          </button>
        )}
      </SheetContent>
    </Sheet>
  )
}
