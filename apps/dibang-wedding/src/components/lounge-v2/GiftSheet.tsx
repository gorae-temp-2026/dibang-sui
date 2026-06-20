// 들러리 · 선물 — 하객↔하객 네트워크 기여(핸드오프 §4). 라운지 레일 액션.
// ⚠️ 현재 스텁: 동선/구조만. 본구현(축가 선정 그리드·43/100인치 디방화환 함께 선물·결제 마감 카운트다운)은
//    `디방웨딩v3/라운지디자인/모이가모인곳_v2.0.html` gift 탭 포팅 예정.
import { Clock, Gift, Music } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const ROWS = [
  { icon: Music, title: '축가 선정', desc: '들러리 자리에서 함께 부를 축가를 골라요.' },
  { icon: Gift, title: '디방화환 함께 선물', desc: '43" · 100" 화환을 하객끼리 모아 선물해요.' },
  { icon: Clock, title: '결제 마감 카운트다운', desc: '식 시작 전까지 함께 참여할 수 있어요.' },
]

export function GiftSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showClose={false} className="border-lng-line bg-white text-lng-ink">
        <SheetHeader>
          <SheetTitle className="text-lng-navy">들러리 · 선물</SheetTitle>
          <SheetDescription className="text-lng-muted">하객끼리 함께 축하해요 — 네트워크 기여.</SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5">
          {ROWS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-lng-line bg-lng-surface px-3.5 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lng-pink text-lng-pink-ink">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-lng-ink">{title}</div>
                <div className="text-[11.5px] text-lng-muted">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-[10.5px] text-lng-muted">
          TODO: 모이가모인곳 v2.0 gift 탭 포팅(축가·디방화환 함께 선물·카운트다운).
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-3 w-full rounded-2xl border border-lng-line bg-lng-surface py-3 text-[14px] font-bold text-lng-ink"
        >
          닫기
        </button>
      </SheetContent>
    </Sheet>
  )
}
