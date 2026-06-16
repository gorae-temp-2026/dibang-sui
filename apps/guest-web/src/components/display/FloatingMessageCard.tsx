import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ACTIVE_ANIMATION } from './animations'
import type { FloatingEnvelopeData } from './types'
import { maskName } from './maskName'
import { serif, FLOAT_START_Y_OFFSET, FLOAT_END_Y_OFFSET } from './constants'
import { decodeHtmlEntities } from '../../lib/decodeHtmlEntities'

export function FloatingMessageCard({
  envelope,
  position,
  disappearY,
  totalMessages,
  maxMessageLength,
  onComplete,
}: {
  envelope: FloatingEnvelopeData
  position: { x: number; y: number } | undefined
  disappearY?: number
  totalMessages?: number
  maxMessageLength?: number
  onComplete?: () => void
}) {
  const firedRef = useRef(false)
  const pos = position ?? { x: envelope.initX, y: envelope.initY }
  const { isReplay } = envelope
  const { isNotice } = envelope
  const isHeartOnly = envelope.message?.trim() === '❤️'
  const hasMessage = !!envelope.message && !isHeartOnly && !isNotice

  const animRef = useRef<{
    posLayer: { initial: unknown; animate: unknown; transition: unknown; exit?: unknown }
    combinedInitial: object
    combinedAnimate: object
    combinedTransition: object
  } | null>(null)
  if (animRef.current === null) {
    const _pl = (() => {
      if (isNotice) {
        const base = ACTIVE_ANIMATION.positionLayer(pos, isReplay, 0, 30)
        return { ...base, transition: { ...base.transition, y: { duration: 22, ease: 'linear' as const } } }
      }
      const base = ACTIVE_ANIMATION.positionLayer(pos, isReplay, envelope.message?.length ?? 0, totalMessages)
      // speedFactor 적용: isNotice 제외, 카드 생성 시 고정된 값 사용
      if (envelope.speedFactor == null || envelope.speedFactor === 1) return base
      const t = base.transition as { x?: unknown; y?: { duration?: number; ease?: string } }
      if (t.y?.duration == null) return base
      return { ...base, transition: { ...t, y: { ...t.y, duration: t.y.duration * envelope.speedFactor } } }
    })()
    const _sl = ACTIVE_ANIMATION.scaleLayer(isReplay)
    const _cl = ACTIVE_ANIMATION.contentLayer(isReplay)
    animRef.current = {
      posLayer: _pl,
      combinedInitial: { ...(_pl.initial as object), ...(_sl.initial as object), ...(_cl.initial as object) },
      combinedAnimate: { ...(_pl.animate as object), ...(_sl.animate as object), ...(_cl.animate as object) },
      combinedTransition: {
        ...(_pl.transition as object),
        scale: _sl.transition,
        opacity: _cl.transition,
      },
    }
  }
  const { posLayer, combinedInitial, combinedAnimate, combinedTransition } = animRef.current!

  useEffect(() => {
    if (!onComplete) return
    const yDuration = (posLayer.transition as { y?: { duration?: number } })?.y?.duration ?? 15

    if (disappearY === undefined) {
      // 안전망: disappearY 미정의 시 최대 animation duration + 2s 여유 후 제거
      const timer = setTimeout(() => {
        if (!firedRef.current) {
          firedRef.current = true
          onComplete()
        }
      }, yDuration * 1000 + 2000)
      return () => clearTimeout(timer)
    }

    const startY = pos.y + FLOAT_START_Y_OFFSET
    const endY = pos.y - FLOAT_END_Y_OFFSET
    const totalDistance = startY - endY
    const distanceToThreshold = startY - disappearY
    if (distanceToThreshold <= 0) {
      firedRef.current = true
      onComplete()
      return
    }
    const ms = (distanceToThreshold / totalDistance) * yDuration * 1000
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, ms)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardStyle: React.CSSProperties = {
    minWidth: 'min(312px, 78vw)',
    maxWidth: 'min(504px, 90vw)',
    background: 'rgba(60, 45, 8, 0.55)',
    border: '1px solid rgba(200, 160, 60, 0.22)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,60,0.08)',
  }

  const decoded = useMemo(() => decodeHtmlEntities(envelope.message), [envelope.message])

  const displayMessage =
    maxMessageLength != null && decoded.length > maxMessageLength
      ? decoded.slice(0, maxMessageLength) + '…'
      : decoded

  return (
    <motion.div
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 10, willChange: 'transform' }}
      // combinedInitial/Animate/Transition·posLayer는 라인 63에서 animRef.current로부터
      // destructure한 값(첫 렌더에만 한 번 init하여 안정 참조 유지). react-hooks/refs는
      // ref-derived 변수가 JSX에 흘러가는 것까지 false-positive로 잡는다.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/refs
      initial={combinedInitial as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/refs
      animate={combinedAnimate as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/refs
      exit={posLayer.exit as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/refs
      transition={combinedTransition as any}
    >
      <div style={{ transform: 'translate(-50%, -50%)', position: 'relative' }}>
        {isNotice ? (
          // 공지 메세지: 알약형 배너
          <p
            className="text-[24px] sm:text-[43px] leading-snug"
            style={{ color: 'rgba(255, 248, 240, 0.65)', letterSpacing: '1.5px', textShadow: '0 2px 12px rgba(0,0,0,0.8)', fontFamily: "'Noto Serif KR', 'Noto Color Emoji', serif" }}
          >
            {envelope.message}
          </p>
        ) : hasMessage ? (
          // 메세지 있음: 카드 스타일 + 본문 + 소속/이름
          <div className="flex flex-col items-start gap-2.5 rounded-2xl px-6 py-5" style={cardStyle}>
            <p
              className="text-[24px] sm:text-[43px] leading-snug"
              style={{ color: 'rgba(255, 250, 244, 0.92)', fontFamily: "'Noto Serif KR', 'Noto Color Emoji', serif" }}
            >
              {displayMessage}
            </p>
            <p
              className="text-[14px] sm:text-[22px]"
              style={{ color: 'rgba(255, 248, 240, 0.50)', letterSpacing: '1px', ...serif }}
            >
              {envelope.guestAffiliation
                ? `${envelope.guestAffiliation} · ${maskName(envelope.guestName)}`
                : maskName(envelope.guestName)}
            </p>
          </div>
        ) : (
          // 메세지 없음: 카드 없이 SVG 하트만 크게
          <svg className="w-[58px] h-[53px] sm:w-[106px] sm:h-[96px]" viewBox="0 0 88 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M44 76 C44 76 4 52 4 26 C4 13 13 4 26 4 C33 4 39 7 44 13 C49 7 55 4 62 4 C75 4 84 13 84 26 C84 52 44 76 44 76Z"
              fill="rgba(220, 38, 38, 0.95)"
            />
          </svg>
        )}
      </div>
    </motion.div>
  )
}
