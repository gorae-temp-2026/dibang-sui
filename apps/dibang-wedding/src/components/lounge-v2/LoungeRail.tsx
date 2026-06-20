// 라운지 우측 세로 액션 레일 — 기본 접힘 + 토글(＋/×). 핸드오프 §12-1.
// 펼치면 액션(공지 host·메모리·피드·들러리선물)이 위로 스태거 등장. 평소 피드를 가리지 않음.
// 규격 = 디방인연 irail과 통일(50px·19px 아이콘·9px 라벨·radius15), 단 색은 라운지 라이트 테마.
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'

export interface RailAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
}

export function LoungeRail({ actions }: { actions: RailAction[] }) {
  const [open, setOpen] = useState(false)
  const shadow = 'shadow-[0_12px_28px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)]'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45]">
      <div className="relative mx-auto h-0 max-w-[480px]">
        <div className="absolute bottom-6 right-4 flex flex-col items-center gap-2.5">
          <AnimatePresence>
            {open &&
              actions.map((a, i) => (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.8 }}
                  transition={{ delay: (actions.length - 1 - i) * 0.035 }}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    type="button"
                    aria-label={a.label}
                    onClick={() => {
                      a.onClick()
                      setOpen(false)
                    }}
                    className={`pointer-events-auto flex h-[50px] w-[50px] items-center justify-center rounded-[15px] border border-black/[0.06] bg-white text-lng-navy ${shadow} transition active:scale-90`}
                  >
                    {a.icon}
                  </button>
                  <span className="text-[9px] font-bold leading-none text-lng-ink">{a.label}</span>
                </motion.div>
              ))}
          </AnimatePresence>

          <button
            type="button"
            aria-label={open ? '레일 접기' : '레일 펴기'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`pointer-events-auto flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-lng-navy text-white ${shadow} transition active:scale-90`}
          >
            {open ? <X className="h-[19px] w-[19px]" /> : <Plus className="h-[19px] w-[19px]" />}
          </button>
        </div>
      </div>
    </div>
  )
}
