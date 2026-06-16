/**
 * DisplayWeddingMemoryBook (v3 포팅)
 *
 * 원본: web-mobile-application/apps/web-app/src/pages/host/memorybook/shared/DisplayWeddingMemoryBook.tsx
 * 변경점:
 *   - formatKoreanDate 인라인 작성 (@gorae/shared 의존 제거)
 *   - types import 경로 v3에 맞춤
 * 디자인·애니메이션·타이밍은 v2와 동일.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fonts } from '../../lib/theme'
import type { MemoryBookData } from './MemoryBookV2_4Types'

// ---------------------------------------------------------------------------
// Inline helpers (v2 의존 제거)
// ---------------------------------------------------------------------------

function formatKoreanDate(date: string, time?: string): string {
  const d = new Date(`${date}T00:00:00`)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  let result = `${year}년 ${month}월 ${day}일 ${dayOfWeek}요일`
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h
    result += ` ${period} ${dh}시`
    if (m > 0) result += ` ${m}분`
  }
  return result
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISPLAY_W = 1080
const DISPLAY_H = 1920

// 디스플레이 앱과 동일한 드리프트 오프셋
const FLOAT_START_Y_OFFSET = 800
const FLOAT_END_Y_OFFSET = 1600

// 화면 상단 15% 지점에서 제거 (디스플레이 앱 disappearY 기준)
const DISAPPEAR_RATIO = 0.15

// 스폰 타이밍
const MAX_CONCURRENT = 7
const SPAWN_MIN = 300
const SPAWN_MAX = 700
const INITIAL_DELAY = 1200

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisplayWeddingMemoryBookProps {
  data: MemoryBookData
}

interface VisibleMessage {
  id: string
  guestName: string
  guestAffiliation: string
  message: string
  isHeart: boolean
  initX: number
  initY: number
  driftDuration: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0
const nextId = (): string => `msg_${++_idCounter}_${Date.now()}`

const randomPosition = (): { x: number; y: number } => ({
  x: 60 + Math.random() * (DISPLAY_W - 420),
  y: DISPLAY_H * 0.35 + Math.random() * (DISPLAY_H * 0.25),
})

function computeDriftDuration(isHeart: boolean, messageLength: number): number {
  // 짧은 메시지/하트: 15s, 긴 메시지: 20s, speedFactor 0.85~1.15
  const speedFactor = 0.85 + Math.random() * 0.3
  const base = isHeart ? 15 : messageLength < 30 ? 15 : 20
  return base * speedFactor
}

function computeDisappearMs(initY: number, driftDuration: number): number {
  const disappearY = DISPLAY_H * DISAPPEAR_RATIO
  const startY = initY + FLOAT_START_Y_OFFSET
  const endY = initY - FLOAT_END_Y_OFFSET
  const totalDistance = startY - endY
  const distanceToThreshold = startY - disappearY

  if (distanceToThreshold <= 0) return 0
  return (distanceToThreshold / totalDistance) * driftDuration * 1000
}

// ---------------------------------------------------------------------------
// FloatingCard
// ---------------------------------------------------------------------------

function FloatingCard({
  item,
  onComplete,
}: {
  item: VisibleMessage
  onComplete: (id: string) => void
}) {
  const firedRef = useRef(false)

  useEffect(() => {
    const ms = computeDisappearMs(item.initY, item.driftDuration)
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete(item.id)
      }
    }, ms)
    return () => clearTimeout(timer)
  }, [item.id, item.initY, item.driftDuration, onComplete])

  const baseMotion = {
    initial: { y: FLOAT_START_Y_OFFSET, opacity: 0 },
    animate: { y: -FLOAT_END_Y_OFFSET, opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
    transition: {
      y: { duration: item.driftDuration, ease: 'linear' as const },
      opacity: { duration: 0.5, ease: 'easeOut' as const },
    },
  }

  if (item.isHeart) {
    return (
      <motion.div
        {...baseMotion}
        initial={{ ...baseMotion.initial, scale: 0.85 }}
        animate={{ ...baseMotion.animate, scale: 1 }}
        transition={{
          ...baseMotion.transition,
          scale: { duration: 0.6, ease: 'easeOut' },
        }}
        style={{
          position: 'absolute',
          left: item.initX,
          top: item.initY,
        }}
      >
        <svg width="88" height="80" viewBox="0 0 88 80" fill="none">
          <path
            d="M44 76 C44 76 4 52 4 26 C4 13 13 4 26 4 C33 4 39 7 44 13 C49 7 55 4 62 4 C75 4 84 13 84 26 C84 52 44 76 44 76Z"
            fill="rgba(220, 38, 38, 0.95)"
          />
        </svg>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...baseMotion}
      style={{
        position: 'absolute',
        left: item.initX,
        top: item.initY,
        backgroundColor: 'rgba(60,45,8,0.55)',
        borderRadius: 16,
        border: '1px solid rgba(200,160,60,0.22)',
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 20,
        paddingRight: 20,
        maxWidth: 420,
        minWidth: 260,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          fontSize: 36,
          lineHeight: '50px',
          color: 'rgba(255,250,244,0.92)',
          marginBottom: 8,
          fontFamily: fonts.serif.family,
          fontWeight: fonts.serif.weight,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {item.message}
      </div>
      <div
        style={{
          fontSize: 18,
          color: 'rgba(255,248,240,0.50)',
          letterSpacing: 1,
          fontFamily: fonts.serif.family,
          fontWeight: fonts.serif.weight,
        }}
      >
        {item.guestAffiliation} · {item.guestName}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// DisplayWeddingMemoryBook — main component
// ---------------------------------------------------------------------------

export default function DisplayWeddingMemoryBook({
  data,
}: DisplayWeddingMemoryBookProps) {
  const { couple, mecMessages, displayPhotos } = data

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setScale(w / DISPLAY_W)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const allPhotos =
    displayPhotos.length > 0
      ? displayPhotos.map((p) => p.url)
      : couple.coverPhoto
        ? [couple.coverPhoto]
        : []
  // slideIndex는 절대 증가, 사용 시점에 modulo. allPhotos.length가 바뀌어도
  // 사용처(340행 `allPhotos[slideIndex % allPhotos.length]`)가 자동으로 새 범위에 맞춰진다.
  // 별도 reset effect 없이 자연스럽게 wrap-around 되므로 set-state-in-effect 회피.
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    if (allPhotos.length <= 1) return
    const interval = setInterval(() => {
      setSlideIndex((prev) => prev + 1)
    }, 6000)
    return () => clearInterval(interval)
  }, [allPhotos.length])

  const [visible, setVisible] = useState<VisibleMessage[]>([])
  const [mockTick, setMockTick] = useState(0)
  const visibleCountRef = useRef(0)

  // mecMessages 배열은 호출자(memorybookAdapter)에서 매 렌더 새 reference로 만들어지므로
  // effect deps에 직접 넣으면 spawn 사이클이 무한 재시작된다. length 변화만 트리거 신호로
  // 두고, 실제 lookup은 ref로 최신 값을 읽는다.
  const mecMessagesRef = useRef(mecMessages)
  useEffect(() => {
    mecMessagesRef.current = mecMessages
  })

  const removeMessage = useCallback((id: string) => {
    setVisible((prev) => {
      const next = prev.filter((m) => m.id !== id)
      visibleCountRef.current = next.length
      return next
    })
  }, [])

  useEffect(() => {
    if (mecMessages.length === 0) return
    const delay =
      mockTick === 0 ? INITIAL_DELAY : SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
    const timer = setTimeout(() => {
      if (visibleCountRef.current >= MAX_CONCURRENT) {
        setMockTick((t) => t + 1)
        return
      }

      const latest = mecMessagesRef.current
      const msg = latest[mockTick % latest.length]
      const pos = randomPosition()
      const isHeart = msg.isHeartOnly ?? false
      const driftDuration = computeDriftDuration(isHeart, (msg.message ?? '').length)

      setVisible((prev) => {
        const next = [
          ...prev,
          {
            id: nextId(),
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
            message: msg.message,
            isHeart,
            initX: pos.x,
            initY: pos.y,
            driftDuration,
          },
        ]
        visibleCountRef.current = next.length
        return next
      })

      setMockTick((t) => t + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [mockTick, mecMessages.length])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: `${DISPLAY_W} / ${DISPLAY_H}`,
        overflow: 'hidden',
        borderRadius: 16,
        position: 'relative',
      }}
    >
      {scale > 0 && (
        <div
          style={{
            width: DISPLAY_W,
            height: DISPLAY_H,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundColor: '#080808',
            overflow: 'hidden',
          }}
        >
          {/* Layer 1: Background photo (slideshow) */}
          {allPhotos.length > 0 && (
            <img
              src={allPhotos[slideIndex % allPhotos.length]}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Layer 2: Top gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '22%',
              background:
                'linear-gradient(to bottom, rgba(8,6,4,0.82) 0%, rgba(8,6,4,0.55) 45%, rgba(8,6,4,0.15) 80%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Layer 2: Bottom gradient */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '35%',
              background:
                'linear-gradient(to top, rgba(6,4,2,0.88) 0%, rgba(6,4,2,0.55) 35%, rgba(6,4,2,0.15) 70%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Layer 2: Vignette */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(6,4,2,0.25) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Layer 10: Couple info */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 48,
              paddingLeft: 36,
              paddingRight: 36,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 20,
                letterSpacing: 10,
                color: 'rgba(255,248,240,0.35)',
                marginBottom: 20,
                fontFamily: fonts.serif.family,
                fontWeight: fonts.serif.weight,
              }}
            >
              WEDDING
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 24,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 57,
                  letterSpacing: 8,
                  color: 'rgba(255,250,244,0.93)',
                  textShadow: '0 2px 24px rgba(0,0,0,0.6)',
                  fontFamily: fonts.serifSemiBold.family,
                  fontWeight: fonts.serifSemiBold.weight,
                }}
              >
                {couple.groomName}
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontStyle: 'italic',
                  color: 'rgba(200,180,155,0.55)',
                  fontFamily: fonts.serif.family,
                  fontWeight: fonts.serif.weight,
                }}
              >
                &amp;
              </span>
              <span
                style={{
                  fontSize: 57,
                  letterSpacing: 8,
                  color: 'rgba(255,250,244,0.93)',
                  textShadow: '0 2px 24px rgba(0,0,0,0.6)',
                  fontFamily: fonts.serifSemiBold.family,
                  fontWeight: fonts.serifSemiBold.weight,
                }}
              >
                {couple.brideName}
              </span>
            </div>
            <div
              style={{
                fontSize: 21,
                letterSpacing: 3,
                color: 'rgba(255,248,240,0.40)',
                marginBottom: 6,
                textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                fontFamily: fonts.serif.family,
                fontWeight: fonts.serif.weight,
              }}
            >
              {formatKoreanDate(couple.weddingDate, couple.time)}
            </div>
            <div
              style={{
                fontSize: 18,
                letterSpacing: 2,
                color: 'rgba(255,248,240,0.25)',
                textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                fontFamily: fonts.serif.family,
                fontWeight: fonts.serif.weight,
              }}
            >
              {couple.venue}
            </div>
          </div>

          {/* Layer 10: Decorative line */}
          <div
            style={{
              position: 'absolute',
              top: '20.5%',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                height: 1,
                width: 28,
                background:
                  'linear-gradient(to right, transparent, rgba(200,180,155,0.25))',
              }}
            />
            <div
              style={{
                height: 3,
                width: 3,
                borderRadius: 1.5,
                backgroundColor: 'rgba(200,180,155,1)',
                opacity: 0.3,
              }}
            />
            <div
              style={{
                height: 3,
                width: 3,
                borderRadius: 1.5,
                backgroundColor: 'rgba(200,180,155,1)',
                opacity: 0.2,
              }}
            />
            <div
              style={{
                height: 3,
                width: 3,
                borderRadius: 1.5,
                backgroundColor: 'rgba(200,180,155,1)',
                opacity: 0.3,
              }}
            />
            <div
              style={{
                height: 1,
                width: 28,
                background:
                  'linear-gradient(to right, rgba(200,180,155,0.25), transparent)',
              }}
            />
          </div>

          {/* Layer 15: Floating message cards */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 15,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <AnimatePresence>
              {visible.map((msg) => (
                <FloatingCard key={msg.id} item={msg} onComplete={removeMessage} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
