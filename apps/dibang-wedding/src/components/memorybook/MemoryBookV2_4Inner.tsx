/**
 * MemoryBookV2_4 (v3 포팅, "Cinematic Film / Photo-First Storytelling")
 *
 * 원본: web-mobile-application/apps/web-app/src/pages/host/memorybook/v2.4_final/MemoryBookV2_4.tsx
 *
 * 섹션 구성:
 *   I.   PrologueSection         — 타이틀 카드 + 히어로 사진
 *   II.  DisplaySection          — MEC 디스플레이 프리뷰
 *   III. GuestPhotoSection       — 사진 + 메시지 몽타주 (5종 비트 시스템)
 *   IV.  BuildupSection          — 하이라이트 직전 메시지 빌드업
 *   V.   HighlightTransition + HighlightSection
 *   VI.  EpilogueSection         — 엔드 크레딧 + 감사
 *
 * v2 대비 변경점 (디자인·애니메이션 100% 동일):
 *   - export default function MemoryBookV2_4 → export function MemoryBookV2_4Inner
 *   - react-router-dom → react-router
 *   - @gorae/shared/lib/formatDate 의 formatKoreanDate → 인라인 작성
 *   - shared/types → ./MemoryBookV2_4Types
 *   - shared/DisplayWeddingMemoryBook → ./DisplayWeddingMemoryBook
 *   - ReCurateButton: weddingId를 search param 대신 props로 받음 → v3 라우트
 *     (`/wedding/${weddingId}/memory-book/curate`)
 */

import { useEffect, useRef, useState, useSyncExternalStore, createContext, useContext } from 'react'
import { useNavigate } from 'react-router'
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from 'framer-motion'
import type { MemoryBookProps } from './MemoryBookV2_4Types'
import DisplayWeddingMemoryBook from './DisplayWeddingMemoryBook'
import { decodeHtml } from '../../lib/htmlDecode'
import { useMemoryBookPreload } from '../../hooks/memorybook/useMemoryBookPreload'
import { useT, useLangStore } from '../../lib/i18n'

const lang = () => useLangStore.getState().lang

// ─────────────────────────────────────────────────────────────────────────────
// Inline helper (v2의 @gorae/shared/lib/formatDate 의존 제거)
// ─────────────────────────────────────────────────────────────────────────────

function formatWeddingDate(date: string, time?: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (lang() === 'en') {
    let result = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (time) {
      const [h, m] = time.split(':').map(Number)
      const dt = new Date(`${date}T${time}:00`)
      result += `, ${dt.toLocaleTimeString('en-US', { hour: 'numeric', ...(m > 0 ? { minute: '2-digit' } : {}) })}`
    }
    return result
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// 디자인 토큰
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = {
  display: "'Cormorant Garamond', 'Noto Serif KR', serif",
  body: "'Pretendard', sans-serif",
}

const COLORS = {
  ground: '#0D0B08',
  groundLight: '#1A1510',
  groundDark: '#080604',
  gold: '#D4A76A',
  cream: '#F5E6C8',
  warmWhite: '#FFF8F0',
  textOnPhoto: 'rgba(255, 248, 240, 0.92)',
  textOnPhotoDim: 'rgba(255, 248, 240, 0.55)',
  textOnDark: 'rgba(255, 248, 240, 0.85)',
  textOnDarkDim: 'rgba(255, 248, 240, 0.4)',
  photoOverlay: 'rgba(0, 0, 0, 0.3)',
  gradientFloor: 'rgba(13, 11, 8, 0.85)',
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────
// - 전역 폰트(Cormorant Garamond/Noto Serif KR/Pretendard) 로드는 App.css의
//   @import 로 이관 (P3-10, useFontLoader 훅 제거).
// - decodeHtml 은 lib/htmlDecode.ts 의 순수 함수로 분리 (모듈 mutable 캐시 제거).

function usePrefersReducedMotion(): boolean {
  // 외부 시스템(matchMedia) 구독은 useSyncExternalStore가 정석. effect 안 sync setState 회피.
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(true)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ─────────────────────────────────────────────────────────────────────────────
// Ken Burns CSS keyframes: App.css 의 @keyframes kenBurns 로 이관 (P3-10).
// 이전의 useKenBurnsStyle 훅은 제거.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WeddingId Context (ReCurateButton 라우팅용; v2의 useSearchParams 대체)
// ─────────────────────────────────────────────────────────────────────────────

const WeddingIdContext = createContext<string>('')

// ─────────────────────────────────────────────────────────────────────────────
// Film Grain Overlay (전역 fixed)
// ─────────────────────────────────────────────────────────────────────────────

function FilmGrain() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.035,
        mixBlendMode: 'overlay',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        backgroundSize: '200px 200px',
        backgroundRepeat: 'repeat',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// I. PrologueSection
// ─────────────────────────────────────────────────────────────────────────────

function PrologueSection({
  groomName,
  brideName,
  weddingDate,
  time,
  venue,
  coverPhoto,
  reducedMotion,
}: {
  groomName: string
  brideName: string
  weddingDate: string
  time?: string
  venue: string
  coverPhoto: string
  reducedMotion: boolean
}) {
  const nameDelay = reducedMotion ? 0 : 0.3
  const photoDelay = reducedMotion ? 0 : 0.5
  const metaDelay = reducedMotion ? 0 : 2.0
  const venueDelay = reducedMotion ? 0 : 2.3
  const scrollPromptDelay = reducedMotion ? 0 : 2.8

  const [showScrollPrompt, setShowScrollPrompt] = useState(false)
  useEffect(() => {
    const t = setTimeout(
      () => setShowScrollPrompt(true),
      (scrollPromptDelay + 0.5) * 1000,
    )
    return () => clearTimeout(t)
  }, [scrollPromptDelay])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        backgroundColor: COLORS.groundDark,
        overflow: 'clip',
      }}
    >
      <motion.img
        src={coverPhoto}
        alt=""
        loading="eager"
        initial={{ opacity: 0, scale: 1.12 }}
        animate={{ opacity: 1, scale: 1.0 }}
        transition={{
          duration: reducedMotion ? 0.5 : 3.0,
          ease: [0.25, 0.1, 0.25, 1],
          delay: photoDelay,
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          animation: reducedMotion
            ? 'none'
            : 'kenBurns 20s ease-in-out infinite alternate',
          transformOrigin: 'center center',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.photoOverlay,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(13,11,8,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '35%',
          background:
            'linear-gradient(to bottom, rgba(13,11,8,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background:
            'linear-gradient(to top, rgba(13,11,8,0.9) 0%, rgba(13,11,8,0.4) 40%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          minHeight: '100dvh',
          paddingBottom: 'clamp(72px, 16dvh, 120px)',
          paddingLeft: 24,
          paddingRight: 24,
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reducedMotion ? 0.3 : 1.2,
            delay: nameDelay,
            ease: 'easeOut',
          }}
          style={{
            fontFamily: FONTS.body,
            fontWeight: 400,
            fontSize: 20,
            letterSpacing: '0.35em',
            color: 'rgba(255, 248, 240, 0.2)',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          WEDDING MEMORY BOOK
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reducedMotion ? 0.3 : 1.2,
            delay: nameDelay,
            ease: 'easeOut',
          }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 'clamp(28px, 8vw, 48px)',
            letterSpacing: '0.18em',
            lineHeight: 1.3,
            color: `rgba(255, 248, 240, 0.92)`,
          }}
        >
          {groomName}
          <span
            style={{
              fontStyle: 'italic',
              opacity: 0.4,
              fontSize: '0.55em',
              margin: '0 0.2em',
            }}
          >
            &amp;
          </span>
          {brideName}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: reducedMotion ? 0.3 : 0.8,
            delay: metaDelay,
            ease: 'easeOut',
          }}
          style={{
            width: 48,
            height: 1,
            backgroundColor: 'rgba(212, 167, 106, 0.25)',
            margin: '20px auto 16px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0.3 : 0.8,
            delay: metaDelay,
            ease: 'easeOut',
          }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 400,
            fontSize: 'clamp(12px, 3vw, 16px)',
            letterSpacing: '0.15em',
            color: COLORS.textOnPhotoDim,
            marginTop: 0,
          }}
        >
          {formatWeddingDate(weddingDate, time)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0.3 : 0.8,
            delay: venueDelay,
            ease: 'easeOut',
          }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 400,
            fontSize: 'clamp(11px, 2.5vw, 14px)',
            letterSpacing: '0.1em',
            color: 'rgba(255, 248, 240, 0.3)',
            marginTop: 6,
          }}
        >
          {venue}
        </motion.div>
      </div>

      <AnimatePresence>
        {showScrollPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <motion.div
              animate={reducedMotion ? {} : { y: [0, 6, 0] }}
              transition={{
                duration: 2.5,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
              style={{
                width: 1,
                height: 28,
                backgroundColor: 'rgba(212, 167, 106, 0.3)',
                margin: '0 auto',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// II. DisplaySection
// ─────────────────────────────────────────────────────────────────────────────

function DisplaySection({ data }: MemoryBookProps) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <>
      <div
        style={{
          height: 100,
          background: `linear-gradient(to bottom, ${COLORS.ground}, ${COLORS.groundDark})`,
        }}
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          width: '100%',
          paddingTop: 80,
          paddingBottom: 80,
          backgroundColor: COLORS.ground,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: '0.3em',
              color: 'rgba(255, 248, 240, 0.2)',
              textTransform: 'uppercase',
            }}
          >
            Dibang
          </div>
          <div
            style={{
              width: 32,
              height: 1,
              backgroundColor: 'rgba(212, 167, 106, 0.2)',
              margin: '16px auto',
            }}
          />
          <div
            style={{
              fontFamily: FONTS.display,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(16px, 4vw, 24px)',
              letterSpacing: '0.08em',
              color: COLORS.textOnDark,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            {t('memorybook.displayHeadingPre')}
            <span style={{ color: COLORS.gold }}>{t('memorybook.displayHeadingHl')}</span>
            {t('memorybook.displayHeadingPost')}
          </div>
        </div>

        <div
          style={{
            maxWidth: 340,
            margin: '0 auto',
            paddingLeft: 16,
            paddingRight: 16,
            boxShadow: '0 0 60px rgba(212, 167, 106, 0.06)',
            borderRadius: 16,
          }}
        >
          <DisplayWeddingMemoryBook data={data} />
        </div>
      </motion.div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat Components
// ─────────────────────────────────────────────────────────────────────────────

function BeatA({
  photoUrl,
  message,
  guestName,
  guestAffiliation,
  reducedMotion,
  isMobile,
}: {
  photoUrl: string
  message: string
  guestName: string
  guestAffiliation: string
  reducedMotion: boolean
  isMobile: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%'])
  const enableParallax = !reducedMotion && !isMobile

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'clip',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <motion.img
          src={photoUrl}
          alt=""
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '110%',
            objectFit: 'cover',
            objectPosition: 'center',
            top: '-5%',
            animation: reducedMotion
              ? 'none'
              : 'kenBurns 15s ease-in-out infinite alternate',
            transformOrigin: 'center center',
            ...(enableParallax ? { y: parallaxY } : {}),
          }}
        />
      </motion.div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.photoOverlay,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          background:
            'linear-gradient(to top, rgba(13,11,8,0.85) 0%, rgba(13,11,8,0.5) 40%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 28px 48px 28px',
          zIndex: 5,
        }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.6,
            delay: reducedMotion ? 0 : 0.4,
            ease: 'easeOut',
          }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 'clamp(18px, 4.6vw, 23px)',
            lineHeight: 1.7,
            color: COLORS.textOnPhoto,
            margin: 0,
          }}
        >
          {decodeHtml(message)}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.6,
            delay: reducedMotion ? 0 : 0.6,
            ease: 'easeOut',
          }}
          style={{ marginTop: 12 }}
        >
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: '0.05em',
              color: COLORS.textOnPhotoDim,
            }}
          >
            {guestName}
          </span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 14,
              color: 'rgba(255, 248, 240, 0.35)',
              marginLeft: 6,
            }}
          >
            — {guestAffiliation}
          </span>
        </motion.div>
      </div>
    </div>
  )
}

function BeatB({
  message,
  guestName,
  reducedMotion,
}: {
  message: string
  guestName: string
  guestAffiliation: string
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        paddingTop: 80,
        paddingBottom: 80,
        backgroundColor: COLORS.ground,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 'clamp(23px, 5.9vw, 34px)',
            lineHeight: 1.8,
            color: COLORS.textOnDark,
            margin: 0,
          }}
        >
          {decodeHtml(message)}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.6,
            delay: reducedMotion ? 0 : 0.2,
            ease: 'easeOut',
          }}
          style={{ marginTop: 20 }}
        >
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              color: COLORS.textOnDarkDim,
            }}
          >
            {guestName}
          </span>
        </motion.div>
      </div>
    </div>
  )
}

function BeatHeart({
  hearts,
  reducedMotion,
}: {
  hearts: Array<{ guestName: string; guestAffiliation: string }>
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        paddingTop: 60,
        paddingBottom: 60,
        backgroundColor: COLORS.ground,
        display: 'flex',
        justifyContent: 'center',
        gap: 32,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {hearts.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.9 }}
          transition={{
            duration: reducedMotion ? 0 : 0.6,
            delay: reducedMotion ? 0 : i * 0.15,
            ease: 'easeOut',
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1 }}>❤️</div>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              color: COLORS.textOnDarkDim,
              textAlign: 'center',
            }}
          >
            {h.guestName}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function BeatC({
  photoUrl,
  reducedMotion,
}: {
  photoUrl: string
  reducedMotion: boolean
  isMobile: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
      style={{
        width: '100%',
        aspectRatio: '4 / 3',
        overflow: 'hidden',
        backgroundColor: COLORS.ground,
      }}
    >
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </motion.div>
  )
}

function BeatD({
  photoUrl1,
  photoUrl2,
  reducedMotion,
}: {
  photoUrl1: string
  photoUrl2: string
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        display: 'flex',
        gap: 3,
        backgroundColor: COLORS.ground,
      }}
    >
      {[photoUrl1, photoUrl2].map((url, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.7,
            delay: reducedMotion ? 0 : i * 0.12,
            ease: 'easeOut',
          }}
          style={{
            flex: 1,
            aspectRatio: '3 / 4',
            overflow: 'hidden',
          }}
        >
          <img
            src={url}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

function BeatE() {
  return (
    <div
      style={{
        height: 120,
        backgroundColor: COLORS.ground,
      }}
    />
  )
}

function BeatFrame({
  photoUrl,
  message,
  guestName,
  guestAffiliation,
  reducedMotion,
}: {
  photoUrl: string
  message: string
  guestName: string
  guestAffiliation: string
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        paddingBottom: 20,
        backgroundColor: COLORS.ground,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' }}
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          overflow: 'hidden',
        }}
      >
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.6,
          delay: reducedMotion ? 0 : 0.3,
          ease: 'easeOut',
        }}
        style={{ marginTop: 16, paddingLeft: 20, paddingRight: 20 }}
      >
        <p
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 'clamp(17px, 4.2vw, 22px)',
            lineHeight: 1.75,
            color: COLORS.textOnDark,
            margin: 0,
          }}
        >
          {decodeHtml(message)}
        </p>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: '0.05em',
              color: COLORS.textOnDarkDim,
            }}
          >
            {guestName}
          </span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 14,
              color: 'rgba(255, 248, 240, 0.25)',
            }}
          >
            — {guestAffiliation}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function BeatStrip({
  photoUrl1,
  photoUrl2,
  photoUrl3,
  reducedMotion,
}: {
  photoUrl1: string
  photoUrl2: string
  photoUrl3: string
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        display: 'flex',
        gap: 3,
        backgroundColor: COLORS.ground,
      }}
    >
      {[photoUrl1, photoUrl2, photoUrl3].map((url, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{
            duration: reducedMotion ? 0 : 0.5,
            delay: reducedMotion ? 0 : i * 0.08,
            ease: 'easeOut',
          }}
          style={{
            flex: 1,
            aspectRatio: '2 / 3',
            overflow: 'hidden',
          }}
        >
          <img
            src={url}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// III. GuestPhotoSection
// ─────────────────────────────────────────────────────────────────────────────

type Beat =
  | { type: 'A'; photoUrl: string; message: string; guestName: string; guestAffiliation: string }
  | { type: 'F'; photoUrl: string; message: string; guestName: string; guestAffiliation: string }
  | { type: 'B'; message: string; guestName: string; guestAffiliation: string }
  | { type: 'C'; photoUrl: string }
  | { type: 'D'; photoUrl1: string; photoUrl2: string }
  | { type: 'E' }
  | { type: 'S'; photoUrl1: string; photoUrl2: string; photoUrl3: string }
  | { type: 'H'; hearts: Array<{ guestName: string; guestAffiliation: string }> }

const BEAT_PATTERNS = [
  ['A', 'E', 'F', 'B', 'F', 'S', 'E', 'B', 'A', 'D', 'F', 'C', 'E', 'A', 'B', 'S', 'F', 'E', 'D', 'B'],
  ['F', 'E', 'B', 'A', 'S', 'E', 'F', 'B', 'D', 'A', 'E', 'B', 'F', 'S', 'A', 'E', 'B', 'F', 'D', 'A'],
  ['A', 'B', 'F', 'E', 'S', 'A', 'B', 'D', 'E', 'F', 'B', 'A', 'S', 'E', 'F', 'B', 'A', 'D', 'E', 'B'],
] as const

function buildBeats(
  photoPool: string[],
  messagePool: Array<{ message: string; guestName: string; guestAffiliation: string }>,
  heartGroups: Array<Array<{ guestName: string; guestAffiliation: string }>>,
  patternVariant: 0 | 1 | 2,
): Beat[] {
  const pattern = BEAT_PATTERNS[patternVariant]
  const beats: Beat[] = []
  let pi = 0
  let lastType: string | null = null

  const longMsgs = messagePool.filter((m) => m.message.length >= 50)
  const shortMsgs = messagePool.filter((m) => m.message.length < 50)
  let lmi = 0
  let smi = 0

  const hasPhoto = () => pi < photoPool.length
  const hasAnyMsg = () => lmi < longMsgs.length || smi < shortMsgs.length
  const hasPhotoPair = () => pi + 1 < photoPool.length
  const hasPhotoTriple = () => pi + 2 < photoPool.length

  const nextMsg = (preferShort: boolean) => {
    if (preferShort && smi < shortMsgs.length) return shortMsgs[smi++]
    if (lmi < longMsgs.length) return longMsgs[lmi++]
    if (smi < shortMsgs.length) return shortMsgs[smi++]
    return null
  }

  const addBeat = (beat: Beat) => {
    beats.push(beat)
    lastType = beat.type
  }

  let patternIdx = 0

  while (hasPhoto() || hasAnyMsg()) {
    const preferred = pattern[patternIdx % pattern.length] as
      | 'A'
      | 'F'
      | 'B'
      | 'C'
      | 'D'
      | 'E'
      | 'S'
    patternIdx++

    if (preferred === 'E' && lastType === 'E') {
      const msg = nextMsg(false)
      if (msg)
        addBeat({
          type: 'B',
          message: msg.message,
          guestName: msg.guestName,
          guestAffiliation: msg.guestAffiliation,
        })
      else if (hasPhoto()) addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      continue
    }

    if (preferred === 'A' || preferred === 'F') {
      if (hasPhoto() && hasAnyMsg()) {
        const msg = nextMsg(true)
        if (msg)
          addBeat({
            type: preferred,
            photoUrl: photoPool[pi++],
            message: msg.message,
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
          })
        else addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      } else if (hasPhoto()) {
        addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      } else {
        const msg = nextMsg(false)
        if (msg)
          addBeat({
            type: 'B',
            message: msg.message,
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
          })
      }
    } else if (preferred === 'B') {
      const msg = nextMsg(false)
      if (msg)
        addBeat({
          type: 'B',
          message: msg.message,
          guestName: msg.guestName,
          guestAffiliation: msg.guestAffiliation,
        })
      else if (hasPhoto()) addBeat({ type: 'C', photoUrl: photoPool[pi++] })
    } else if (preferred === 'C') {
      if (hasPhoto()) addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      else {
        const msg = nextMsg(false)
        if (msg)
          addBeat({
            type: 'B',
            message: msg.message,
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
          })
      }
    } else if (preferred === 'D') {
      if (hasPhotoPair())
        addBeat({ type: 'D', photoUrl1: photoPool[pi++], photoUrl2: photoPool[pi++] })
      else if (hasPhoto()) addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      else {
        const msg = nextMsg(false)
        if (msg)
          addBeat({
            type: 'B',
            message: msg.message,
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
          })
      }
    } else if (preferred === 'E') {
      addBeat({ type: 'E' })
    } else if (preferred === 'S') {
      if (hasPhotoTriple())
        addBeat({
          type: 'S',
          photoUrl1: photoPool[pi++],
          photoUrl2: photoPool[pi++],
          photoUrl3: photoPool[pi++],
        })
      else if (hasPhotoPair())
        addBeat({ type: 'D', photoUrl1: photoPool[pi++], photoUrl2: photoPool[pi++] })
      else if (hasPhoto()) addBeat({ type: 'C', photoUrl: photoPool[pi++] })
      else {
        const msg = nextMsg(false)
        if (msg)
          addBeat({
            type: 'B',
            message: msg.message,
            guestName: msg.guestName,
            guestAffiliation: msg.guestAffiliation,
          })
      }
    }

    if (!hasPhoto() && !hasAnyMsg()) break
  }

  if (heartGroups.length > 0 && beats.length > 0) {
    const interval = Math.floor(beats.length / (heartGroups.length + 1))
    for (let i = heartGroups.length - 1; i >= 0; i--) {
      const insertAt = interval * (i + 1)
      beats.splice(insertAt, 0, { type: 'H', hearts: heartGroups[i] })
    }
  }

  return beats
}

function GuestPhotoSection({
  data,
  reducedMotion,
  isMobile,
}: MemoryBookProps & { reducedMotion: boolean; isMobile: boolean }) {
  const coverUrl = data.couple.coverPhoto

  const photoPool = data.guestPhotos
    .filter((p) => p.url !== coverUrl)
    .slice(0, 30)
    .map((p) => p.url)

  const textMessages = data.mecMessages.filter(
    (m) => !m.isHeartOnly && m.message && m.message.trim() !== '',
  )
  const heartMessages = data.mecMessages.filter(
    (m) => m.isHeartOnly || !m.message || m.message.trim() === '',
  )

  const messagePool = textMessages.slice(0, 25).map((m) => ({
    message: m.message,
    guestName: m.guestName,
    guestAffiliation: m.guestAffiliation,
  }))

  const heartGroups: Array<Array<{ guestName: string; guestAffiliation: string }>> = []
  for (let i = 0; i < heartMessages.length; i += 3) {
    heartGroups.push(
      heartMessages.slice(i, i + 3).map((m) => ({
        guestName: m.guestName,
        guestAffiliation: m.guestAffiliation,
      })),
    )
  }

  const patternVariant = (photoPool.length % 3) as 0 | 1 | 2
  const beats = buildBeats(photoPool, messagePool, heartGroups, patternVariant)

  return (
    <>
      <div style={{ height: 80, backgroundColor: COLORS.ground }} />
      <div style={{ backgroundColor: COLORS.ground }}>
        {beats.map((beat, idx) => {
          const key = `beat-${idx}`
          if (beat.type === 'A')
            return (
              <BeatA
                key={key}
                photoUrl={beat.photoUrl}
                message={beat.message}
                guestName={beat.guestName}
                guestAffiliation={beat.guestAffiliation}
                reducedMotion={reducedMotion}
                isMobile={isMobile}
              />
            )
          if (beat.type === 'F')
            return (
              <BeatFrame
                key={key}
                photoUrl={beat.photoUrl}
                message={beat.message}
                guestName={beat.guestName}
                guestAffiliation={beat.guestAffiliation}
                reducedMotion={reducedMotion}
              />
            )
          if (beat.type === 'B')
            return (
              <BeatB
                key={key}
                message={beat.message}
                guestName={beat.guestName}
                guestAffiliation={beat.guestAffiliation}
                reducedMotion={reducedMotion}
              />
            )
          if (beat.type === 'H')
            return <BeatHeart key={key} hearts={beat.hearts} reducedMotion={reducedMotion} />
          if (beat.type === 'C')
            return (
              <BeatC
                key={key}
                photoUrl={beat.photoUrl}
                reducedMotion={reducedMotion}
                isMobile={isMobile}
              />
            )
          if (beat.type === 'D')
            return (
              <BeatD
                key={key}
                photoUrl1={beat.photoUrl1}
                photoUrl2={beat.photoUrl2}
                reducedMotion={reducedMotion}
              />
            )
          if (beat.type === 'E') return <BeatE key={key} />
          if (beat.type === 'S')
            return (
              <BeatStrip
                key={key}
                photoUrl1={beat.photoUrl1}
                photoUrl2={beat.photoUrl2}
                photoUrl3={beat.photoUrl3}
                reducedMotion={reducedMotion}
              />
            )
          return null
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IV. BuildupSection
// ─────────────────────────────────────────────────────────────────────────────

function BuildupSection({
  data,
  reducedMotion,
}: MemoryBookProps & { reducedMotion: boolean }) {
  const textOnly = data.mecMessages.filter(
    (m) => !m.isHeartOnly && m.message && m.message.trim() !== '',
  )
  const buildupMessages = textOnly.slice(25, 30)

  if (buildupMessages.length === 0) return null

  return (
    <div style={{ backgroundColor: COLORS.ground }}>
      <div style={{ height: 80 }} />

      {buildupMessages.map((m, i) => {
        const isLast = i === buildupMessages.length - 1
        return (
          <BuildupMessage
            key={m.id}
            message={m.message}
            guestName={m.guestName}
            guestAffiliation={m.guestAffiliation}
            reducedMotion={reducedMotion}
            isLast={isLast}
          />
        )
      })}

      <div style={{ height: 40 }} />
    </div>
  )
}

function BuildupMessage({
  message,
  guestName,
  guestAffiliation,
  reducedMotion,
  isLast,
}: {
  message: string
  guestName: string
  guestAffiliation: string
  reducedMotion: boolean
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        paddingTop: isLast ? 64 : 48,
        paddingBottom: isLast ? 64 : 48,
        paddingLeft: 28,
        paddingRight: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 340, textAlign: 'center' }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: isLast ? 'clamp(23px, 5.9vw, 31px)' : 'clamp(20px, 4.9vw, 26px)',
            lineHeight: 1.9,
            color: COLORS.textOnDark,
            margin: 0,
          }}
        >
          {decodeHtml(message)}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.6,
            delay: reducedMotion ? 0 : 0.3,
            ease: 'easeOut',
          }}
          style={{ marginTop: 16 }}
        >
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              color: COLORS.textOnDarkDim,
            }}
          >
            {guestName}
          </span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 14,
              color: 'rgba(255, 248, 240, 0.25)',
              marginLeft: 6,
            }}
          >
            — {guestAffiliation}
          </span>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// V. HighlightTransition + HighlightSection
// ─────────────────────────────────────────────────────────────────────────────

function HighlightTransition({ reducedMotion }: { reducedMotion: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-5% 0px' })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        paddingTop: 80,
        paddingBottom: 80,
        background: `linear-gradient(to bottom, ${COLORS.ground} 0%, #3A3530 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={inView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
        style={{
          width: 48,
          height: 1,
          backgroundColor: 'rgba(212, 167, 106, 0.2)',
          marginBottom: 24,
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.6,
          delay: reducedMotion ? 0 : 0.3,
          ease: 'easeOut',
        }}
        style={{
          fontFamily: FONTS.body,
          fontWeight: 400,
          fontSize: 14,
          letterSpacing: '0.35em',
          color: 'rgba(255, 248, 240, 0.15)',
          textTransform: 'uppercase' as const,
          marginBottom: 16,
        }}
      >
        HIGHLIGHT
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{
          duration: reducedMotion ? 0 : 0.7,
          delay: reducedMotion ? 0 : 0.5,
          ease: 'easeOut',
        }}
        style={{
          fontFamily: FONTS.display,
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: 'clamp(16px, 4vw, 22px)',
          letterSpacing: '0.08em',
          color: COLORS.textOnDark,
        }}
      >
        {t('memorybook.highlightSubtitle')}
      </motion.div>
    </div>
  )
}

function VerticalFilmStrip({
  photos,
  reducedMotion,
  inView,
  delayOffset,
}: {
  photos: Array<{ id: string; url: string }>
  reducedMotion: boolean
  inView: boolean
  delayOffset: number
}) {
  const holeCount = photos.length * 3

  const colVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.06,
        delayChildren: reducedMotion ? 0 : delayOffset,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: reducedMotion ? 0 : 0.25,
        ease: [0.2, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  }

  const sprocketColumn = (
    <div
      style={{
        width: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        flexShrink: 0,
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      {Array.from({ length: holeCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 8,
            borderRadius: 1.5,
            backgroundColor: '#3A3530',
          }}
        />
      ))}
    </div>
  )

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        backgroundColor: '#151210',
        borderRadius: 2,
      }}
    >
      {sprocketColumn}

      <motion.div
        variants={colVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          padding: '6px 3px',
        }}
      >
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            variants={itemVariants}
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              overflow: 'hidden',
            }}
          >
            <img
              src={photo.url}
              alt=""
              loading={i < 2 ? 'eager' : 'lazy'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {sprocketColumn}
    </div>
  )
}

function HighlightSection({
  data,
  reducedMotion,
}: MemoryBookProps & { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-5% 0px' })

  const seen = new Set<string>()
  const highlightPhotos = [...data.displayPhotos, ...data.curatedPhotos].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
  if (highlightPhotos.length === 0) return null
  const photos = highlightPhotos

  const leftStrip = photos.filter((_, i) => i % 2 === 0)
  const rightStrip = photos.filter((_, i) => i % 2 === 1)

  return (
    <div
      ref={ref}
      style={{
        background: `linear-gradient(to bottom, #3A3530 0%, #3A3530 90%, ${COLORS.ground} 100%)`,
        paddingBottom: 60,
        display: 'flex',
        gap: 10,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 12,
        alignItems: 'flex-start',
      }}
    >
      <VerticalFilmStrip
        photos={leftStrip}
        reducedMotion={reducedMotion}
        inView={inView}
        delayOffset={0}
      />
      <div style={{ marginTop: 40, flex: 1 }}>
        <VerticalFilmStrip
          photos={rightStrip}
          reducedMotion={reducedMotion}
          inView={inView}
          delayOffset={0.1}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VI. EpilogueSection
// ─────────────────────────────────────────────────────────────────────────────

function EpilogueSection({
  data,
  reducedMotion,
}: MemoryBookProps & { reducedMotion: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  const { couple, stats } = data
  const finalPhoto = couple.coverPhoto

  const staggerItem = (delayOffset: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: {
      duration: reducedMotion ? 0 : 0.8,
      delay: reducedMotion ? 0 : delayOffset,
      ease: 'easeOut' as const,
    },
  })

  return (
    <>
      <div style={{ height: 100, backgroundColor: COLORS.ground }} />

      <motion.div
        ref={ref}
        style={{
          width: '100%',
          minHeight: '100dvh',
          backgroundColor: COLORS.ground,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 80,
          paddingBottom: 80,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <motion.div {...staggerItem(0)} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 'clamp(48px, 12vw, 72px)',
              letterSpacing: '0.05em',
              color: COLORS.warmWhite,
              lineHeight: 1,
            }}
          >
            {stats.totalGuests}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 'clamp(16px, 3.9vw, 20px)',
              letterSpacing: '0.1em',
              color: COLORS.warmWhite,
              marginTop: 8,
            }}
          >
            {t('memorybook.statGuests')}
          </div>
        </motion.div>

        <motion.div {...staggerItem(0.3)} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 'clamp(48px, 12vw, 72px)',
              letterSpacing: '0.05em',
              color: COLORS.warmWhite,
              lineHeight: 1,
            }}
          >
            {stats.totalMessages}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 'clamp(16px, 3.9vw, 20px)',
              letterSpacing: '0.1em',
              color: COLORS.warmWhite,
              marginTop: 8,
            }}
          >
            {t('memorybook.statMessages')}
          </div>
        </motion.div>

        <motion.div {...staggerItem(0.6)} style={{ textAlign: 'center', marginBottom: 0 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 'clamp(48px, 12vw, 72px)',
              letterSpacing: '0.05em',
              color: COLORS.warmWhite,
              lineHeight: 1,
            }}
          >
            {stats.photosUploaded}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 'clamp(16px, 3.9vw, 20px)',
              letterSpacing: '0.1em',
              color: COLORS.warmWhite,
              marginTop: 8,
            }}
          >
            {t('memorybook.statPhotos')}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 1.0 }}
          style={{
            width: 40,
            height: 1,
            backgroundColor: 'rgba(212, 167, 106, 0.2)',
            margin: '24px auto 48px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 1.2 }}
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(212, 167, 106, 0.2)',
            boxShadow: '0 0 40px rgba(212, 167, 106, 0.08)',
            marginBottom: 40,
            flexShrink: 0,
          }}
        >
          <img
            src={finalPhoto}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 1.5 }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 'clamp(18px, 5vw, 28px)',
            letterSpacing: '0.1em',
            lineHeight: 1.6,
            color: COLORS.textOnDark,
            textAlign: 'center',
            marginBottom: 20,
            maxWidth: 380,
          }}
        >
          {t('memorybook.closingLine1')}
          <br />
          {t('memorybook.closingLine2')}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 1.8 }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 400,
            fontSize: 'clamp(14px, 3.5vw, 20px)',
            letterSpacing: '0.12em',
            color: COLORS.gold,
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          {couple.groomName} &amp; {couple.brideName}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 2.0 }}
          style={{
            fontFamily: FONTS.display,
            fontWeight: 400,
            fontSize: 14,
            letterSpacing: '0.08em',
            color: COLORS.textOnDarkDim,
            textAlign: 'center',
          }}
        >
          {formatWeddingDate(couple.weddingDate, couple.time)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 2.2 }}
          style={{
            width: 48,
            height: 1,
            backgroundColor: 'rgba(212, 167, 106, 0.15)',
            marginTop: 48,
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 2.4 }}
          style={{
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: '0.35em',
              color: 'rgba(255, 248, 240, 0.35)',
              textTransform: 'uppercase',
            }}
          >
            Dibang
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 14,
              letterSpacing: '0.2em',
              color: 'rgba(255, 248, 240, 0.25)',
              marginTop: 4,
            }}
          >
            {t('memorybook.tagline')}
          </div>
        </motion.div>

        <div
          style={{
            marginTop: 64,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <ExitButton reducedMotion={reducedMotion} inView={inView} />
          <ReCurateButton reducedMotion={reducedMotion} inView={inView} />
        </div>
      </motion.div>
    </>
  )
}

function ExitButton({ reducedMotion, inView }: { reducedMotion: boolean; inView: boolean }) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 3.0 }}
      onClick={() => navigate(-1)}
      style={{
        background: 'none',
        border: '1px solid rgba(212, 167, 106, 0.25)',
        borderRadius: 999,
        padding: '12px 32px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body,
          fontWeight: 300,
          fontSize: 14,
          letterSpacing: '0.15em',
          color: 'rgba(255, 248, 240, 0.4)',
        }}
      >
        {t('memorybook.back')}
      </span>
    </motion.button>
  )
}

function ReCurateButton({ reducedMotion, inView }: { reducedMotion: boolean; inView: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const weddingId = useContext(WeddingIdContext)

  if (!weddingId) return null

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 3.0 }}
      onClick={() => navigate(`/wedding/${weddingId}/memory-book/curate`)}
      style={{
        background: 'none',
        border: '1px solid rgba(212, 167, 106, 0.45)',
        borderRadius: 999,
        padding: '12px 32px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body,
          fontWeight: 300,
          fontSize: 14,
          letterSpacing: '0.15em',
          color: 'rgba(255, 248, 240, 0.7)',
        }}
      >
        {t('memorybook.reCurate')}
      </span>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root: MemoryBookV2_4Inner
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryBookV2_4InnerProps extends MemoryBookProps {
  /** ReCurateButton의 v3 라우트 (/wedding/:weddingId/memory-book/curate) 빌드용 */
  weddingId?: string
}

export function MemoryBookV2_4Inner({
  data: rawData,
  weddingId = '',
}: MemoryBookV2_4InnerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useIsMobile()

  // URL 변환(thumbUrl 적용) + 이미지 preload. window.scrollTo 는 라우트 진입 책임으로
  // 분리되어 WeddingMemoryBookPage 에서 수행 (P3-10).
  const data = useMemoryBookPreload(rawData)

  return (
    <WeddingIdContext.Provider value={weddingId}>
      <div
        style={{
          backgroundColor: COLORS.groundDark,
          minHeight: '100dvh',
          fontFamily: FONTS.body,
          color: COLORS.warmWhite,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <FilmGrain />

        <PrologueSection
          groomName={data.couple.groomName}
          brideName={data.couple.brideName}
          weddingDate={data.couple.weddingDate}
          time={data.couple.time}
          venue={data.couple.venue}
          coverPhoto={data.couple.coverPhoto}
          reducedMotion={reducedMotion}
        />

        <DisplaySection data={data} />

        <GuestPhotoSection data={data} reducedMotion={reducedMotion} isMobile={isMobile} />

        <BuildupSection data={data} reducedMotion={reducedMotion} />

        <HighlightTransition reducedMotion={reducedMotion} />

        <HighlightSection data={data} reducedMotion={reducedMotion} />

        <EpilogueSection data={data} reducedMotion={reducedMotion} />
      </div>
    </WeddingIdContext.Provider>
  )
}
