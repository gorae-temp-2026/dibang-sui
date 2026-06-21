// 디방인연 우측 세로 네비 레일(irail) — 목업(.irail) 규격: 우하단(right:12·bottom) 플로팅,
// 독립 버튼(박스 래퍼 없음) 50px·radius 15·19px 아이콘·8px 라벨, 다크 "유니버스" 톤.
// 기능정의 §0: 유니버스(피드)·받은이음·채팅·프로필. 네비라 상시 노출.
import { Globe, Inbox, MessageCircle, User } from 'lucide-react'
import type { InyeonScreen } from '../../machines/inyeon.machine'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/utils'

const ITEMS: { key: InyeonScreen; tkey: string; Icon: typeof Globe }[] = [
  { key: 'universe', tkey: 'inyeon.rail.universe', Icon: Globe },
  { key: 'received', tkey: 'inyeon.rail.received', Icon: Inbox },
  { key: 'chat', tkey: 'inyeon.rail.chat', Icon: MessageCircle },
  { key: 'me', tkey: 'inyeon.rail.me', Icon: User },
]

export function InyeonRail({ active, onNav }: { active: InyeonScreen; onNav: (s: InyeonScreen) => void }) {
  const t = useT()
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[96px] z-40">
      <div className="relative mx-auto h-0 max-w-[420px]">
        <div className="absolute bottom-0 right-3 flex flex-col items-center gap-[9px]">
          {ITEMS.map(({ key, tkey, Icon }) => {
            const on = active === key
            const label = t(tkey)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNav(key)}
                aria-label={label}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'pointer-events-auto flex h-[50px] w-[50px] flex-col items-center justify-center gap-0.5 rounded-[15px] border shadow-[0_6px_16px_rgba(0,0,0,0.4)] backdrop-blur-md transition-colors',
                  on ? 'border-[#87CEEB] bg-[#1E3A5F] text-white' : 'border-white/[0.16] bg-[#0d1621]/50 text-white/70 hover:text-white/90',
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={on ? 2.1 : 1.7} />
                <span className="text-[8px] font-bold leading-none">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
