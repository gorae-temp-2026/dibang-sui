// 공유 프로필 — 디방인연(①②) · 모이가모인곳/라운지(③) 공용 (핸드오프 §6·§13).
// presentation: 'sheet'(라운지=바텀시트) / 'page'(인연=풀페이지 슬라이드업, 모달 아님 — T5).
// 상단(따뜻함): 큰 사진 + 이음전·익명 뱃지 + 후크 + 📍어디서 마주쳤나. 분석: ① 인연 망 + ② 나와의
// 시그널 + 크레딧. ★정확 Moi Credit은 온체인(프로필 밖). 산출공식 설명은 Setting > 모이크레딧이란?.
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import type { MeetingContext, ProfileContext, ProfileData } from './types'
import { InyeonGraph } from './InyeonGraph'
import { SignalSunburst } from './SignalSunburst'
import { TrustRange } from './TrustRange'

// 실사진 에셋 전 — hue 그라데이션 placeholder (InyeonCard와 통일).
const photoBg = (hue: number) => `linear-gradient(150deg, hsl(${hue} 52% 34%), hsl(${(hue + 36) % 360} 48% 16%))`

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
  /** 상단 만남 맥락(사진·후크·출처). 미지정 시 분석만(예: 내 전체 프로필). */
  meeting?: MeetingContext
  /** 받은 선물 신뢰 신호 누적(증여=EM·CS). ② signal에 가시화. */
  giftSignal?: number
  /** 이음 신청 CTA. 미지정 시 버튼 숨김. */
  onIeum?: () => void
  /** 표현 방식: sheet(바텀시트, 기본) / page(풀페이지 슬라이드업 — 인연). */
  presentation?: 'sheet' | 'page'
}

export function ProfileSheet({ open, onOpenChange, data, context = 'inyeon', meeting, giftSignal, onIeum, presentation = 'sheet' }: ProfileSheetProps) {
  const offline = context === 'lounge' // ③ 오프라인 이음 = 이름·소속·전체 네트워크 공개
  const name = offline ? data.subject : '익명 모이'

  const body = (
    <>
      {meeting && (
        <>
          {/* 큰 프로필 사진 + 이음전·익명 뱃지 + 후크 (익명이어도 사진은 노출) */}
          <div className="relative mb-3 h-52 overflow-hidden rounded-2xl bg-cover bg-[center_22%]" style={meeting.photoUrl ? { backgroundImage: `url(${meeting.photoUrl})` } : { background: photoBg(meeting.photoHue) }}>
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0d1621]/92 via-[#0d1621]/40 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0d1621]/55 px-2.5 py-1 text-[10.5px] font-bold text-white backdrop-blur">
              {offline ? '✓ 이음 완료 · 실명' : (<><Lock className="h-3 w-3" /> 이음 전 · 익명</>)}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-4">
              {offline && <div className="mb-1 text-[18px] font-extrabold text-white">{name}</div>}
              <div className="flex items-center gap-2 text-[14.5px] font-bold text-white">
                <span className="text-lg">{meeting.prov[0]?.emoji ?? '🏛'}</span>
                {meeting.hook}
              </div>
              {meeting.mutualCount > 0 && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  🤝 공통 친구 {meeting.mutualCount}명
                </span>
              )}
            </div>
          </div>

          {/* 📍 어디서 마주쳤나 — 출처 + 관계 태그 */}
          <Section title="📍 어디서 마주쳤나">
            <div className="space-y-2">
              {meeting.prov.map((p) => (
                <div key={p.text} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <b className="text-[13px] font-bold text-white">{p.text}</b>
                    {p.sub && <span className="block text-[11px] text-white/50">{p.sub}</span>}
                  </div>
                  {p.tag && <span className="flex-shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{p.tag}</span>}
                </div>
              ))}
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/70">
                🤝 공통으로 아는 사람 {meeting.mutualCount}명 · 신뢰 <b className="text-[#F8C57A]">{meeting.balLabel}</b>
              </div>
            </div>
          </Section>
        </>
      )}

      <p className="mb-3 text-[11px] leading-relaxed text-white/50">
        {offline
          ? '라운지(오프라인 이음 ③) — 이름·소속·전체 신뢰네트워크 공개'
          : '디방인연(온라인 ①②) — 이음 전엔 익명: 연결 모양·신뢰 범위만'}
      </p>

      <Section title="① 인연 연결">
        <InyeonGraph data={data} size={250} />
        <p className="mt-1.5 text-[10px] text-white/40">
          {offline ? '실명 네트워크' : '누구와 이음됐는지 (익명)'} · 강한 이웃 {data.graph.nodes.length - 1}명
        </p>
        {data.graph.nodes.some((n) => n.here) && (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45">
            <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full ring-2 ring-[#F8C57A]" />
            {offline ? '이 결혼식에서 만난 사람' : '직접 이어진 사람'} · 나머지는 더 넓은 신뢰 네트워크
          </p>
        )}
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
        {giftSignal != null && giftSignal > 0 && (
          <div className="mt-2 rounded-xl border border-[#F8C57A]/30 bg-[#F8C57A]/10 px-3 py-2 text-[11.5px] text-white/85">
            💝 받은 선물 신뢰 신호 <b className="text-[#F8C57A]">+{giftSignal}</b> <span className="text-white/45">· 증여=EM·CS (라이브 Moi Credit 반영 예정)</span>
          </div>
        )}
      </Section>

      <Section title="익명 신뢰범위">
        <TrustRange trust={data.trustRange} />
      </Section>

      {onIeum && (
        <button
          type="button"
          onClick={onIeum}
          className="mt-1 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
        >
          {offline ? '이음 신청 · 대화는 디방인연에서' : '이음 신청하기'}
        </button>
      )}
    </>
  )

  // ── 풀페이지(인연) — 바텀모달 아님, 한 페이지가 아래서 위로 확장(T5). ──
  if (presentation === 'page') {
    if (!open) return null
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.25, 1] }}
        className="fixed inset-0 z-[60] mx-auto flex max-w-[480px] flex-col bg-[#0A1626] text-[#E8EFF6]"
      >
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/8 bg-[#0A1626]/92 px-3 py-3 backdrop-blur">
          <button type="button" aria-label="뒤로" onClick={() => onOpenChange(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[16px] font-extrabold text-white">{offline ? `${name} · 프로필` : '프로필'}</h2>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">{body}</div>
      </motion.div>
    )
  }

  // ── 바텀시트(라운지/기본) ──
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh]">
        <SheetHeader>
          <SheetTitle>{offline ? `${name} · 프로필` : '프로필'}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
