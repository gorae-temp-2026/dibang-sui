// 디방인연 우측 세로 네비 레일(irail) — 라운지 vrail과 통일된 규격.
// 핸드오프 §12-1: 50px 버튼 · 19px 아이콘 · 9px 라벨 · radius 15. 단 색은 다크 "유니버스" 테마.
// 기능정의 §0: 유니버스(피드)·받은이음·채팅·프로필. (라운지 레일과 달리 네비라 상시 노출 — 접지 않음)
import { Globe, Inbox, MessageCircle, User } from 'lucide-react'
import type { InyeonScreen } from '../../machines/inyeon.machine'
import { cn } from '../../lib/utils'

const ITEMS: { key: InyeonScreen; label: string; Icon: typeof Globe }[] = [
  { key: 'universe', label: '유니버스', Icon: Globe },
  { key: 'received', label: '받은이음', Icon: Inbox },
  { key: 'chat', label: '채팅', Icon: MessageCircle },
  { key: 'me', label: '프로필', Icon: User },
]

export function InyeonRail({ active, onNav }: { active: InyeonScreen; onNav: (s: InyeonScreen) => void }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 top-1/2 z-40 -translate-y-1/2">
      <div className="relative mx-auto h-0 max-w-[420px]">
        <div className="absolute right-2.5 top-0 flex -translate-y-1/2 flex-col items-center gap-2 rounded-[19px] border border-white/10 bg-[#0c1a2e]/80 p-1.5 backdrop-blur-md">
          {ITEMS.map(({ key, label, Icon }) => {
            const on = active === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNav(key)}
                aria-label={label}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'pointer-events-auto flex h-[50px] w-[50px] flex-col items-center justify-center gap-1 rounded-[15px] transition-colors',
                  on ? 'bg-[#1E3A5F] text-white' : 'text-white/55 hover:text-white/80',
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={on ? 2.1 : 1.7} />
                <span className="text-[9px] font-bold leading-none">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
