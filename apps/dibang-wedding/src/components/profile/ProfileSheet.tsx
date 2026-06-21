// 공유 프로필 — 디방인연(①②) · 모이가모인곳/라운지(③) 공용 (핸드오프 §6·§13, 정보공개테이블 260621).
// presentation: 'sheet'(라운지) / 'page'(인연 풀페이지 슬라이드업). 순서: 소개글 → 어디서 마주쳤나 → 인연 망 → (나와의 시그널) → 크레딧.
// 공개 단계: 이음 전 = 이음 '수' + 크레딧(정성)만 / 이음 후(또는 라운지 ③) = 인연 망·나와의 시그널 상세.
// 용어(260621): 인연 망 · 나와의 시그널 · 크레딧(정성 좋음/보통, 정확 Moi Credit은 온체인). 산출공식=Setting>모이크레딧이란?.
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import type { MeetingContext, ProfileContext, ProfileData } from './types'
import { useT } from '../../lib/i18n'
import { InyeonGraph } from './InyeonGraph'
import { SignalSunburst } from './SignalSunburst'

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
  /** 공개 범위: inyeon(①② 온라인) / lounge(③ 오프라인·전체공개). */
  context?: ProfileContext
  /** 상단 만남 맥락(사진·후크·소개글·출처). */
  meeting?: MeetingContext
  /** 받은 선물 신뢰 신호 누적. ② 시그널에 가시화(이음 후). */
  giftSignal?: number
  /** 이음 신청 CTA. 미지정 시 버튼 숨김. */
  onIeum?: () => void
  /** 표현: sheet(바텀시트) / page(풀페이지 — 인연). */
  presentation?: 'sheet' | 'page'
  /** 이음 완료 = 상세 공개(시그널·인연 망). 라운지(offline)는 자동 공개. */
  revealed?: boolean
}

export function ProfileSheet({ open, onOpenChange, data, context = 'inyeon', meeting, giftSignal, onIeum, presentation = 'sheet', revealed = false }: ProfileSheetProps) {
  const t = useT()
  const offline = context === 'lounge'
  const showDetail = offline || revealed // 이음 후/라운지 = 시그널·인연 망 상세 공개
  const name = showDetail ? data.subject : '익명 모이'
  const ieumCount = Math.max(0, data.graph.nodes.length - 1)
  const creditGood = ['AAA', 'AA', 'A'].includes(data.moiCredit.tier)
  const creditLabel = creditGood ? t('profile.creditGood') : t('profile.creditFair')

  const body = (
    <>
      {meeting && (
        <>
          {/* 큰 프로필 사진 + 단계 뱃지 + 후크(정성 closeness) */}
          <div className="relative mb-3 h-52 overflow-hidden rounded-2xl bg-cover bg-[center_22%]" style={meeting.photoUrl ? { backgroundImage: `url(${meeting.photoUrl})` } : { background: photoBg(meeting.photoHue) }}>
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0d1621]/92 via-[#0d1621]/40 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0d1621]/55 px-2.5 py-1 text-[10.5px] font-bold text-white backdrop-blur">
              {showDetail ? '✓ 이음 완료 · 실명' : (<><Lock className="h-3 w-3" /> 이음 전 · 익명</>)}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-4">
              {showDetail && <div className="mb-1 text-[18px] font-extrabold text-white">{name}</div>}
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

          {/* 소개글 — 먼저 */}
          {meeting.intro && (
            <Section title={t('profile.bio')}>
              <p className="rounded-xl bg-white/[0.04] px-3.5 py-3 text-[12.5px] leading-relaxed text-white/80">{meeting.intro}</p>
            </Section>
          )}

          {/* 📍 어디서 마주쳤나 */}
          <Section title={t('profile.whereMet')}>
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
            </div>
          </Section>
        </>
      )}

      {/* 인연 망 — 이음 전엔 '이음 수'만, 이음 후엔 그래프(가운데 정렬) */}
      <Section title={t('profile.network')}>
        {showDetail ? (
          <>
            <div className="flex justify-center">
              <InyeonGraph data={data} size={250} />
            </div>
            <p className="mt-1.5 text-center text-[10px] text-white/40">{offline ? '실명 네트워크' : '나와의 연결 망'} · 강한 이웃 {ieumCount}명</p>
            {data.graph.nodes.some((n) => n.here) && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-white/45">
                <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full ring-2 ring-[#F8C57A]" />
                {offline ? '이 결혼식에서 만난 사람' : '직접 이어진 사람'} · 나머지는 더 넓은 망
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">🔗 {t('profile.ieumCount', { n: ieumCount })}</span>
            <span className="flex items-center gap-1 text-[10.5px] text-white/45"><Lock className="h-3 w-3" /> {t('profile.afterIeum')}</span>
          </div>
        )}
      </Section>

      {/* 나와의 시그널 — 이음 후만(가운데 정렬) */}
      {showDetail && (
        <Section title={t('profile.signal')}>
          <div className="flex justify-center">
            <SignalSunburst data={data.signal} size={180} />
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-white/70">
            <li><b className="text-[#D4687A]">EM</b> 부조·증여</li>
            <li><b className="text-[#5B89B3]">CS</b> 참석·이음·대화</li>
            <li><b className="text-[#B8884A]">AR</b> 관계</li>
            <li><b className="text-[#9999AD]">MP</b> 거래</li>
          </ul>
          {giftSignal != null && giftSignal > 0 && (
            <div className="mt-2 rounded-xl border border-[#F8C57A]/30 bg-[#F8C57A]/10 px-3 py-2 text-center text-[11.5px] text-white/85">
              💝 받은 선물 신뢰 신호 <b className="text-[#F8C57A]">+{giftSignal}</b>
            </div>
          )}
        </Section>
      )}

      {/* 크레딧 — 정성(좋음/보통)만, 정확 수치는 온체인 */}
      <Section title={t('profile.credit')}>
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-3">
          <span className={`rounded-full px-3 py-1 text-[13px] font-extrabold ${creditGood ? 'bg-[#3FAE6E]/20 text-[#6fe0a0]' : 'bg-white/10 text-white/70'}`}>
            🪙 {creditLabel}
          </span>
          <span className="text-[10.5px] leading-relaxed text-white/45">{t('profile.creditOnchain')}</span>
        </div>
      </Section>

      {onIeum && (
        <button
          type="button"
          onClick={onIeum}
          className="mt-1 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
        >
          {offline ? '이음 신청 · 대화는 디방인연에서' : t('inyeon.ieum')}
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
          <h2 className="text-[16px] font-extrabold text-white">{showDetail ? `${name} · 프로필` : '프로필'}</h2>
        </header>
        <div className="scrollbar-hide flex-1 overflow-y-auto px-4 pb-24 pt-3">{body}</div>
      </motion.div>
    )
  }

  // ── 바텀시트(라운지/기본) ──
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh]">
        <SheetHeader>
          <SheetTitle>{showDetail ? `${name} · 프로필` : '프로필'}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
