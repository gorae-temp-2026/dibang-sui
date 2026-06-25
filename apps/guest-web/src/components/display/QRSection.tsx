import { type RefObject, memo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChukuihamQR } from './ChukuihamQR'
import { useT } from '../../lib/i18n'

// ─── Constants ──────────────────────────────────────────────────────────────

const ENVELOPE_DURATION = 2.8
const ENVELOPE_COUNT = 3
const STAGGER_DELAY = 1.4

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Single envelope that flies from guest to couple */
function FlyingEnvelope({ delay }: { delay: number }) {
  return (
    <motion.span
      className="absolute text-[18px]"
      style={{ left: 27, top: '50%', y: '-50%' }}
      initial={{ opacity: 0, x: 0, scale: 0.7 }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        x: [0, 36, 108, 162, 198],
        scale: [0.7, 1, 1, 1, 0.7],
        y: ['-50%', '-70%', '-40%', '-60%', '-50%'],
      }}
      transition={{
        duration: ENVELOPE_DURATION,
        delay,
        repeat: Infinity,
        repeatDelay: ENVELOPE_COUNT * STAGGER_DELAY - ENVELOPE_DURATION + STAGGER_DELAY,
        ease: 'easeInOut',
        times: [0, 0.15, 0.5, 0.85, 1],
      }}
    >
      <span style={{ fontFamily: "'Noto Color Emoji', sans-serif" }}>💌</span>
    </motion.span>
  )
}

/** Guest → Couple message flying animation strip */
// 레거시 코드 동일성 보존: 정의만 두고 호출은 주석 처리됨(`<MessageFlyAnimation />`).
// tsc noUnusedLocals 회피를 위해 파일 맨 아래에서 void 참조한다.
const MessageFlyAnimation = memo(function MessageFlyAnimation() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 270, height: 47, marginBottom: -4 }}
    >
      <span
        className="absolute text-[23px]"
        style={{
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          filter: 'grayscale(0.3)',
          opacity: 0.75,
          fontFamily: "'Noto Color Emoji', sans-serif",
        }}
      >
        👨🏻👩🏻
      </span>

      {Array.from({ length: ENVELOPE_COUNT }, (_, i) => (
        <FlyingEnvelope key={i} delay={i * STAGGER_DELAY} />
      ))}

      <span
        className="absolute text-[23px]"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.85,
          fontFamily: "'Noto Color Emoji', sans-serif",
        }}
      >
        👰🏻‍♀️&thinsp;🤵🏻‍♂️
      </span>
    </div>
  )
})

// ─── QR Border Glow (conic-gradient + RAF) ──────────────────────────────────
// dibang party 패턴 기반. 웨딩용: 골드 단색, 색상 전환 없이 부드러운 회전.

const GLOW_COLOR_ACTIVE = 'rgba(255, 220, 180, 0.9)'
const GLOW_COLOR_IDLE = 'rgba(200, 210, 220, 0.5)'

const DEG_PER_MS = 360 / 4000 // 4초에 1회전
const S1_S = 5, S1_E = 25     // 빛 구간 1: 5%~25%
const S2_S = 55, S2_E = 75    // 빛 구간 2: 55%~75%
const SOFT = 2                 // soft edge %

function softGrad(c: string) {
  return `conic-gradient(from var(--qr-angle), ` +
    `transparent 0%, ` +
    `transparent ${S1_S - SOFT}%, ${c} ${S1_S + SOFT}%, ` +
    `${c} ${S1_E - SOFT}%, transparent ${S1_E + SOFT}%, ` +
    `transparent ${S2_S - SOFT}%, ${c} ${S2_S + SOFT}%, ` +
    `${c} ${S2_E - SOFT}%, transparent ${S2_E + SOFT}%)`
}

const QRBorderGlow = memo(function QRBorderGlow({ active }: { active: boolean }) {
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    const color = active ? GLOW_COLOR_ACTIVE : GLOW_COLOR_IDLE
    el.style.background = softGrad(color)

    let angle = 0
    let lastTime = performance.now()

    function tick(now: number) {
      const dt = now - lastTime
      lastTime = now
      angle = (angle + DEG_PER_MS * dt) % 360

      if (glowRef.current) {
        glowRef.current.style.setProperty('--qr-angle', angle + 'deg')
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: active ? -14 : -10,
    filter: active ? 'blur(12px)' : 'blur(8px)',
    borderRadius: 34,
    pointerEvents: 'none',
    transition: 'inset 0.5s ease, filter 0.5s ease',
  }

  return <div ref={glowRef} style={glowStyle} />
})

// ─── Main Export ─────────────────────────────────────────────────────────────

interface QRSectionProps {
  qrUrl: string
  qrRef: RefObject<HTMLDivElement | null>
  glowActive?: boolean
}

export const QRSection = memo(function QRSection({ qrUrl, qrRef, glowActive = false }: QRSectionProps) {
  const t = useT()
  return (
    <div className="flex flex-col items-center gap-3">
      {/* 1. Guest → Couple message flying animation — 주석 처리 */}
      {/* <MessageFlyAnimation /> */}

      {/* 2. QR code with border glow */}
      <div
        ref={qrRef}
        className="relative"
        onClick={import.meta.env.DEV ? () => window.open(qrUrl, '_blank') : undefined}
        style={import.meta.env.DEV ? { cursor: 'pointer' } : undefined}
      >
        <QRBorderGlow active={glowActive} />
        <ChukuihamQR qrUrl={qrUrl} />
      </div>

      {/* 3. Text below QR */}
      <p
        className="text-[26px] text-center leading-relaxed"
        style={{
          color: 'rgba(255, 248, 240, 0.45)',
          letterSpacing: '0.5px',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}
      >
        {t('display.qrCta')}
      </p>
    </div>
  )
})

// 시각 동일성 보존(레거시 mecdisplay/QRSection): 주석 처리된 `<MessageFlyAnimation />`
// 호출을 그대로 둔다. unused 컴파일 에러 회피용 no-op 참조.
void MessageFlyAnimation
