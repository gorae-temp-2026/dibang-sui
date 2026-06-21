// 들러리 · 선물 · 참여(MAKERS) — 하객↔하객 네트워크 기여(핸드오프 §4). 라운지 레일 액션.
// SSOT: 모이가모인곳_v2.0.html gift 탭 정합 — 들러리 자리 그리드 · 43/100인치 디방화환 · 결제 마감 카운트다운.
// 들러리 일부 담당 = tier0 인연 페르소나(서아·하늘·하린) 매칭 → 라운지=인연 동일 인물(실명·실사진).
import { Clock } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import {
  ROLE_SLOTS_DONE,
  ROLE_SLOTS_PENDING,
  GIFT_PRODUCTS,
  GIFT_DEADLINE,
  TEAM_LABEL,
  MEDAL_LABEL,
  timeUntil,
  type RoleSlot,
} from './giftData'

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mb-3 text-center">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-lng-pink-ink">{eyebrow}</span>
      <h3 className="mt-0.5 text-[17px] font-extrabold text-lng-navy">{title}</h3>
      <p className="mx-auto mt-0.5 max-w-[280px] text-[11.5px] leading-relaxed text-lng-muted">{desc}</p>
    </div>
  )
}

function teamClass(team?: string) {
  return team === 'groomsman' ? 'bg-lng-blue/10 text-lng-blue' : 'bg-lng-pink text-lng-pink-ink'
}

function DoneSlot({ slot }: { slot: RoleSlot }) {
  return (
    <div className="rounded-2xl border border-lng-line bg-white px-2 py-2 text-center">
      <div className="mb-0.5 flex h-[13px] items-center justify-center">
        {slot.medal && (
          <span className={`rounded-full px-1.5 py-[1px] text-[8px] font-bold text-white ${slot.medal === 'bestman' ? 'bg-lng-amber' : 'bg-lng-pink-ink'}`}>
            {MEDAL_LABEL[slot.medal]}
          </span>
        )}
      </div>
      <div className="flex min-h-[26px] items-center justify-center text-[10.5px] font-bold leading-tight text-lng-navy">{slot.label}</div>
      <div className="mx-auto my-1.5 h-11 w-11">
        {slot.photoUrl ? (
          <img src={slot.photoUrl} alt={slot.name} className="h-11 w-11 rounded-full object-cover shadow-sm ring-2 ring-white" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lng-pink text-[15px] font-bold text-lng-pink-ink ring-2 ring-white">
            {slot.name?.charAt(0)}
          </div>
        )}
      </div>
      <div className="truncate text-[12px] font-bold text-lng-ink">{slot.name}</div>
      {slot.team && (
        <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ${teamClass(slot.team)}`}>
          {TEAM_LABEL[slot.team]}
        </span>
      )}
      <div className="mt-0.5 text-[10px] font-semibold text-[#E8607A]">♥ {slot.hearts}</div>
    </div>
  )
}

function PendingSlot({ slot }: { slot: RoleSlot }) {
  const cd = slot.deadline ? timeUntil(slot.deadline) : null
  return (
    <div className="rounded-2xl border border-dashed border-lng-navy/30 bg-lng-surface px-2.5 py-2.5 text-center">
      <div className="flex min-h-[18px] items-center justify-center text-[11px] font-bold leading-tight text-lng-navy">{slot.label}</div>
      <div className="relative mx-auto my-1.5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-lng-navy/25 text-[18px] text-lng-muted">
        ?
        <span className="absolute -bottom-1 -right-1 text-[14px]">✋</span>
      </div>
      <div className="text-[10.5px] text-lng-muted">후보자 {slot.candidates}명</div>
      {cd && (
        <div className="mt-0.5 text-[10px] font-semibold text-lng-coral">{cd.expired ? '마감' : `마감 ${cd.label}`}</div>
      )}
      <div className="mt-1.5 flex gap-1">
        <button type="button" className="flex-1 rounded-lg bg-lng-navy py-1 text-[10.5px] font-bold text-white">지원</button>
        <button type="button" className="flex-1 rounded-lg border border-lng-line bg-white py-1 text-[10.5px] font-bold text-lng-ink">추천</button>
      </div>
    </div>
  )
}

function BridesmaidSection() {
  return (
    <section className="mb-6">
      <SectionHead eyebrow="Bridesmaids · Groomsmen" title="들러리" desc="우리를 더 빛나게 해주는 사람이에요." />
      <div className="grid grid-cols-3 gap-2">
        {ROLE_SLOTS_DONE.map((s) => (
          <DoneSlot key={s.id} slot={s} />
        ))}
      </div>
      <p className="mb-1.5 mt-3 px-0.5 text-[11px] font-bold text-lng-navy">아직 모집 중인 자리</p>
      <div className="grid grid-cols-2 gap-2">
        {ROLE_SLOTS_PENDING.map((s) => (
          <PendingSlot key={s.id} slot={s} />
        ))}
      </div>
    </section>
  )
}

function GiftSection() {
  const cd = timeUntil(GIFT_DEADLINE)
  return (
    <section className="mb-6">
      <SectionHead eyebrow="Gifts" title="선물" desc="결혼식 위에 얹히는 디지털 선물. 혼자 또는 여럿이 함께 선물할 수 있어요." />
      <div className="mb-3 rounded-2xl border border-lng-pink-ink/15 bg-lng-pink/50 px-3.5 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-lng-pink-ink">
          <Clock className="h-3.5 w-3.5" />
          {cd.expired ? (
            <span>디방화환 결제가 마감되었어요</span>
          ) : (
            <span>디방화환 결제 마감까지 <span className="text-[13.5px]">{cd.label}</span> 남았어요</span>
          )}
        </div>
        <p className="mt-1 text-[10.5px] text-lng-muted">결혼식 2주 전까지 확정돼야 웨딩홀 셋팅이 진행돼요.</p>
      </div>
      <div className="space-y-2.5">
        {GIFT_PRODUCTS.map((g) => (
          <div key={g.id} className="rounded-2xl border border-lng-line bg-white p-3.5">
            <div className="flex items-start gap-3">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-lng-surface text-[26px]">
                📺
                {g.premium && (
                  <span className="absolute -right-1 -top-1 rounded-md bg-lng-amber px-1 py-0.5 text-[8px] font-bold text-white">PRO</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-lng-ink">{g.name}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-lng-muted">{g.desc}</p>
                <div className="mt-1 text-[13px] font-extrabold text-lng-navy">
                  {g.yone.toLocaleString()}
                  <span className="text-[11px] font-bold"> 요네</span>
                  <span className="ml-1.5 text-[10.5px] font-normal text-lng-muted">또는 카드 {g.krw}</span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" className="rounded-xl bg-lng-navy py-2 text-[12px] font-bold text-white">선물하기</button>
              <button type="button" className="rounded-xl border border-lng-navy/20 bg-white py-2 text-[12px] font-bold text-lng-navy">함께 선물하기</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function GiftSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showClose className="border-lng-line bg-white text-lng-ink">
        <SheetHeader>
          <SheetTitle className="text-lng-navy">들러리 · 선물</SheetTitle>
          <SheetDescription className="text-lng-muted">하객끼리 함께 축하해요 — 우리의 네트워크가 결혼식을 채워요.</SheetDescription>
        </SheetHeader>

        <BridesmaidSection />
        <GiftSection />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-2xl border border-lng-line bg-lng-surface py-3 text-[14px] font-bold text-lng-ink"
        >
          닫기
        </button>
      </SheetContent>
    </Sheet>
  )
}
