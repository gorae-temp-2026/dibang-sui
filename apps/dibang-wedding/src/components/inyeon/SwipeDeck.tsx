// 세로 피드 스와이프 덱 — 위로 스와이프(또는 넘기기 버튼) = 다음 사람 (기능정의 §1, 틱톡식).
// framer-motion(tech-stack-map 등재 스택)으로 드래그. 맨 위 카드만 드래그/액션, 뒤 2장은 시각 스택.
import { type ReactNode, useState, useEffect } from 'react'
import { motion, useAnimationControls, type PanInfo } from 'framer-motion'
import { Sparkles, ChevronUp } from 'lucide-react'
import type { Moi } from './types'
import { InyeonCard } from './InyeonCard'
import { useT } from '../../lib/i18n'

function TopCard({ cardKey, onSwipeNext, children }: { cardKey: number; onSwipeNext: () => void; children: ReactNode }) {
  const controls = useAnimationControls()
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -100 || info.velocity.y < -600) {
      void controls.start({ y: -800, opacity: 0, transition: { duration: 0.22 } }).then(onSwipeNext)
    } else {
      void controls.start({ y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } })
    }
  }
  return (
    <motion.div
      key={cardKey}
      className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.5}
      animate={controls}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  )
}

interface SwipeDeckProps {
  pool: Moi[]
  queue: number[]
  photoIdx: Record<number, number>
  unlocked: Record<number, boolean>
  onPhotoNav: (id: number, dir: 1 | -1) => void
  onUnlock: (id: number) => void
  onSwipeNext: () => void
  onOpenProfile: (id: number) => void
  onReset: () => void
}

export function SwipeDeck({
  pool,
  queue,
  photoIdx,
  unlocked,
  onPhotoNav,
  onUnlock,
  onSwipeNext,
  onOpenProfile,
  onReset,
}: SwipeDeckProps) {
  const t = useT()
  const [showHint, setShowHint] = useState(() => !sessionStorage.getItem('dibang:swipe-hint-seen'))
  useEffect(() => {
    if (!showHint) return
    const timer = setTimeout(() => {
      setShowHint(false)
      sessionStorage.setItem('dibang:swipe-hint-seen', '1')
    }, 3000)
    return () => clearTimeout(timer)
  }, [showHint])
  const visible = queue.slice(0, 3)

  if (visible.length === 0) {
    return (
      <div className="relative mx-4 my-3.5 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-8 text-center">
        <Sparkles className="h-11 w-11 text-[#87CEEB]" />
        <div className="text-base font-extrabold text-white">{t('inyeon.deckEmptyTitle')}</div>
        <div className="text-[12.5px] leading-relaxed text-white/55">{t('inyeon.deckEmptyDesc')}</div>
        <button
          type="button"
          onClick={onReset}
          className="mt-1 rounded-2xl bg-[#152a44] px-5 py-2.5 text-[13px] font-extrabold text-[#cfe0ee]"
        >
          {t('inyeon.deckReset')}
        </button>
      </div>
    )
  }

  return (
    <div className="relative mx-4 my-3.5 min-h-0 flex-1">
      {showHint && visible.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1 rounded-2xl bg-black/50 px-5 py-3 backdrop-blur"
          >
            <ChevronUp className="h-6 w-6 text-white" />
            <span className="text-xs font-semibold text-white">위로 스와이프</span>
          </motion.div>
        </div>
      )}
      {[...visible].reverse().map((id) => {
        const depth = visible.indexOf(id)
        const moi = pool.find((m) => m.id === id)
        if (!moi) return null
        const card = (
          <InyeonCard
            moi={moi}
            photoIdx={photoIdx[id] ?? 0}
            unlocked={!!unlocked[id]}
            isTop={depth === 0}
            depth={depth}
            onPhotoNav={(dir) => onPhotoNav(id, dir)}
            onUnlock={() => onUnlock(id)}
            onPass={onSwipeNext}
            onOpenProfile={() => onOpenProfile(id)}
          />
        )
        if (depth === 0) {
          return (
            <TopCard key={id} cardKey={id} onSwipeNext={onSwipeNext}>
              {card}
            </TopCard>
          )
        }
        return (
          <div key={id} className="absolute inset-0">
            {card}
          </div>
        )
      })}
    </div>
  )
}
