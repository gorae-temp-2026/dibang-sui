// mecdisplay → guest-web 이식(SCENARIOS §1 시각 100% 동일성 기준).
// 레거시 web-mobile-application/apps/display/src/DisplayPage.tsx 의 Layer 1~20 JSX·
// 동작·상수를 그대로 보존. 변경 영역: import 경로, wedding/사진은 v3 API(useDisplayWedding),
// entries/messages는 Supabase 직접 + Realtime 두 트리거(entries+messages) + catch-up.
// photo_url은 카드화에서 무시(SCENARIOS §1-3).
//
// 상태 흐름은 src/machines/display.machine.ts(loading→ready→subscribing→reconnecting)에
// 위탁. 카드 큐는 useEnvelopeQueue.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router'
import { useMachine } from '@xstate/react'

import { BackgroundSlideshow } from '../components/display/BackgroundSlideshow'
import { FloatingMessageCard } from '../components/display/FloatingMessageCard'
import { FloatingStickerHeart } from '../components/display/FloatingStickerHeart'
import { QRSection } from '../components/display/QRSection'
import { HostNamesRow } from '../components/display/HostParents'
import { useEnvelopeQueue } from '../components/display/useEnvelopeQueue'
import { useViewportScale } from '../components/display/useViewportScale'
import { serif, NOTICE_DELAY_MS, NOTICE_INITIAL_DELAY_MS } from '../components/display/constants'
import { INFO_MESSAGES } from '../components/display/infoMessages'
import { formatKoreanDate } from '../components/display/formatDate'

// v3 sentinel: 게스트가 '하트 보내기'를 누르면 guestbook_messages.message가 '__HEART__'로
// 저장된다(guest-web GuestFlowPage / guestFlow.machine.ts). mecdisplay에서는 이 값을
// 메시지 카드로 렌더하지 않고 SVG 하트 sticker(FloatingStickerHeart)로 펑 떠올린다.
// sentinel 분기는 useDisplayLiveFeed 훅 내부에서 처리하고, page는 sticker 큐만 본다.
const MAX_ACTIVE_STICKERS = 20
const STICKER_SIZE = 120
interface StickerEntry { id: string; x: number; y: number }

import { useDisplayWedding } from '../hooks/useDisplayWedding'
import { useDisplayLiveFeed } from '../hooks/display/useDisplayLiveFeed'
import { useBodyStyleScope } from '../hooks/useBodyStyleScope'
import { displayMachine } from '../machines/display.machine'

export default function DisplayPage() {
  const [searchParams] = useSearchParams()
  const weddingId = searchParams.get('weddingId')

  // mecdisplay 풀스크린 환경 보장: 마운트 동안만 body 스타일을 강제 설정하고
  // 언마운트 시 복원. (UI/데이터 분리 1-D: useBodyStyleScope 훅으로 캡슐화)
  useBodyStyleScope({
    margin: '0',
    padding: '0',
    display: 'block',
    background: '#080808',
    minHeight: 'auto',
    alignItems: 'stretch',
  })

  const { wedding, loungeId, photoUrls, isLoading, notFound } = useDisplayWedding(weddingId)

  const [state, send] = useMachine(displayMachine, { input: { weddingId } })

  const { visible, historyCount, addLiveEnvelope, addNoticeEnvelope, removeEnvelope, seedHistory, containerRef, qrRef, headerRef } = useEnvelopeQueue()
  const vpScale = useViewportScale()
  const disappearY = typeof window !== 'undefined' ? window.innerHeight * 0.15 : 0

  // __HEART__ sentinel → FloatingStickerHeart 큐. 카드 큐와 별개.
  const [activeStickers, setActiveStickers] = useState<StickerEntry[]>([])
  const addSticker = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    const areaW = (rect ? rect.width : window.innerWidth) - STICKER_SIZE
    const areaH = (rect ? rect.height : window.innerHeight) - STICKER_SIZE
    const offsetX = rect ? rect.left : 0
    const offsetY = rect ? rect.top : 0
    const x = offsetX + Math.random() * Math.max(areaW, 0)
    const y = offsetY + Math.random() * Math.max(areaH, 0)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setActiveStickers((prev) => {
      const next = [...prev, { id, x, y }]
      return next.length > MAX_ACTIVE_STICKERS ? next.slice(-MAX_ACTIVE_STICKERS) : next
    })
  }, [containerRef])
  const removeSticker = useCallback((id: string) => {
    setActiveStickers((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // wedding 로딩 결과 → machine 이벤트. send는 useMachine 반환의 stable 함수라 deps에서
  // 제외(매 렌더 새 reference로 평가될 가능성을 차단해 무한 루프 방지).
  useEffect(() => {
    if (!weddingId) { send({ type: 'WEDDING_MISSING_ID' }); return }
    if (notFound) { send({ type: 'WEDDING_NOT_FOUND' }); return }
    if (loungeId) { send({ type: 'WEDDING_LOADED', loungeId }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId, notFound, loungeId])

  // ─── 안내 메세지 무한루프 ───────────────────────────────────────────
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeIndexRef = useRef(0)
  const addNoticeRef = useRef(addNoticeEnvelope)
  useEffect(() => { addNoticeRef.current = addNoticeEnvelope }, [addNoticeEnvelope])

  const scheduleNotice = useCallback((delayMs = NOTICE_DELAY_MS) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => {
      const idx = noticeIndexRef.current
      const message = INFO_MESSAGES[idx]
      noticeIndexRef.current = (idx + 1) % INFO_MESSAGES.length
      addNoticeRef.current(message)
    }, delayMs)
  }, [])

  useEffect(() => {
    scheduleNotice(NOTICE_INITIAL_DELAY_MS)
    return () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current) }
  }, [scheduleNotice])

  // ─── 시드 + Realtime + catch-up + retry는 useDisplayLiveFeed 훅에 위임 ──
  // page에는 envelope 큐(UI state)와 sticker 큐만 남는다. 데이터 경로(supabase
  // client·채널·시드 fetch·catch-up·재구독)는 훅 내부로 캡슐화. __HEART__ sentinel
  // 분기, 카드 큐 push, sticker dispatch, machine send 모두 훅이 책임.
  useDisplayLiveFeed({ loungeId, addLiveEnvelope, seedHistory, addSticker, send })

  // ─── Render ───────────────────────────────────────────────────────
  // 머신 상태로 화면 분기 — db 로딩·구독·재연결·치명오류를 UI에 반영(허울 해소, XS-1).
  if (state.matches('fatalError')) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400">
        {state.context.fatalReason === 'wedding 미존재'
          ? '결혼식을 찾을 수 없습니다'
          : 'URL에 ?weddingId=xxx를 입력해주세요'}
      </div>
    )
  }

  if (state.matches('loadingWedding') || isLoading || !wedding) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400">
        결혼식 정보를 불러오는 중...
      </div>
    )
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const qrUrl = `${baseUrl}/?weddingId=${weddingId}`

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: '#080808' }}>

      {/* 실시간 구독 재연결 표시 — 머신 reconnecting 상태(SUBSCRIBE_ERROR/TIMEOUT) 반영 */}
      {state.matches('reconnecting') && (
        <div className="absolute left-1/2 top-3 z-[30] -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-amber-300">
          실시간 연결 재시도 중…
        </div>
      )}

      {/* -- Layer 1: 배경 사진 (슬라이드쇼, 2슬롯 DOM) -- */}
      <BackgroundSlideshow photos={photoUrls} photoUrl={wedding?.photoUrl} />

      {/* -- Layer 2: 그라데이션 오버레이들 -- */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[2]"
        style={{
          height: '22%',
          background: 'linear-gradient(180deg, rgba(8,6,4,0.82) 0%, rgba(8,6,4,0.55) 45%, rgba(8,6,4,0.15) 80%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2]"
        style={{
          height: '35%',
          background: 'linear-gradient(0deg, rgba(6,4,2,0.88) 0%, rgba(6,4,2,0.55) 35%, rgba(6,4,2,0.15) 70%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, rgba(6,4,2,0.25) 100%)',
        }}
      />

      {/* -- Layer 10: 커플 정보 + 장식선 -- */}
      <div
        className="pointer-events-none absolute inset-0 z-[10]"
        style={{
          transform: vpScale > 1 ? `scale(${vpScale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        <div
          ref={headerRef}
          className="pointer-events-none absolute left-0 right-0 top-0 z-[10] text-center px-5 pt-6 sm:px-9 sm:pt-12"
        >
          <HostNamesRow wedding={wedding} />
          <p
            className="mb-1 sm:mb-1.5 text-[13px] sm:text-[21px] tracking-[2px] sm:tracking-[3px]"
            style={{ color: 'rgba(255, 248, 240, 0.40)', textShadow: '0 1px 12px rgba(0,0,0,0.5)', ...serif }}
          >
            {formatKoreanDate(wedding.date, wedding.time)}
          </p>
          <p
            className="text-[11px] sm:text-[18px] tracking-[1px] sm:tracking-[2px]"
            style={{ color: 'rgba(255, 248, 240, 0.25)', textShadow: '0 1px 12px rgba(0,0,0,0.5)', ...serif }}
          >
            {wedding.venue}
          </p>
        </div>

        {/* -- Layer 10: 장식선 -- */}
        <div
          className="pointer-events-none absolute z-[10] flex items-center gap-2"
          style={{ top: '20.5%', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,180,155,0.25))' }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: 'rgba(200,180,155,0.30)' }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: 'rgba(200,180,155,0.20)' }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: 'rgba(200,180,155,0.30)' }} />
          <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(200,180,155,0.25), transparent)' }} />
        </div>
      </div>

      {/* -- Layer 15: 봉투 플로팅 (d3-force 영역) -- */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-[15] overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 13%, black 18%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 13%, black 18%)',
        }}
      >
        <AnimatePresence>
          {visible.map((env) => (
            <FloatingMessageCard
              key={env.id}
              envelope={env}
              position={undefined}
              disappearY={disappearY}
              totalMessages={historyCount}
              onComplete={() => {
                removeEnvelope(env.id)
                if (env.isNotice) scheduleNotice(NOTICE_DELAY_MS)
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* -- Layer 20: 축의함 QR (하단 고정, 모바일 숨김) -- */}
      <div
        className="absolute bottom-[20%] landscape:bottom-[3%] left-1/2 z-[20] -translate-x-1/2 hidden sm:flex landscape:origin-bottom"
        style={{ scale: vpScale }}
      >
        <QRSection qrUrl={qrUrl} qrRef={qrRef} glowActive={photoUrls.length === 0} />
      </div>

      {/* -- Layer 25: __HEART__ sentinel → SVG 하트 sticker (1회성, 4초) -- */}
      <AnimatePresence>
        {activeStickers.map((s) => (
          <FloatingStickerHeart
            key={s.id}
            id={s.id}
            x={s.x}
            y={s.y}
            stickerType="heart"
            onComplete={() => removeSticker(s.id)}
          />
        ))}
      </AnimatePresence>

    </div>
  )
}
