// 들러리 · 선물 · 참여(MAKERS) — 하객↔하객 네트워크 기여(핸드오프 §4). 라운지 레일 액션.
// SSOT: 모이가모인곳_v2.0.html gift 탭 정합 — 들러리 자리 그리드 · 43/100인치 디방화환 · 결제 마감 카운트다운.
// 들러리 일부 담당 = tier0 인연 페르소나(서아·하늘·하린) 매칭 → 라운지=인연 동일 인물(실명·실사진).
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import {
  ROLE_SLOTS_DONE,
  ROLE_SLOTS_PENDING,
  GIFT_PRODUCTS,
  GIFT_DEADLINE,
  TEAM_LABEL,
  MEDAL_LABEL,
  timeUntil,
  VENDORS,
  MOI_HEAD_BASE,
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

// 들러리 얼굴 — 실사진(페르소나) 우선, 없거나 깨지면 손그림 모이 head로 fallback.
function MoiFace({ slot, dashed }: { slot: RoleSlot; dashed?: boolean }) {
  const t = useT()
  const [failed, setFailed] = useState(false)
  const headUrl = `${MOI_HEAD_BASE}/${slot.head ?? 'chu_default'}.png`
  const usePhoto = !!slot.photoUrl && !failed
  return (
    <div className={`h-11 w-11 overflow-hidden rounded-full bg-lng-surface ring-2 ring-white ${dashed ? 'outline-dashed outline-1 outline-lng-navy/25' : ''}`}>
      <img
        src={usePhoto ? slot.photoUrl : headUrl}
        alt={slot.name ?? t('loungeV2.gift.moiAlt')}
        onError={() => setFailed(true)}
        className={usePhoto ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-[3px]'}
        draggable={false}
      />
    </div>
  )
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
      <div className="my-1.5 flex justify-center">
        <MoiFace slot={slot} />
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
  const t = useT()
  const cd = slot.deadline ? timeUntil(slot.deadline) : null
  return (
    <div className="rounded-2xl border border-dashed border-lng-navy/30 bg-lng-surface px-2.5 py-2.5 text-center">
      <div className="flex min-h-[18px] items-center justify-center text-[11px] font-bold leading-tight text-lng-navy">{slot.label}</div>
      <div className="my-1.5 flex justify-center">
        <div className="relative">
          <MoiFace slot={slot} dashed />
          <span className="absolute -bottom-1 -right-1 text-[14px]">✋</span>
        </div>
      </div>
      <div className="text-[10.5px] text-lng-muted">{t('loungeV2.gift.candidates', { n: slot.candidates })}</div>
      {cd && (
        <div className="mt-0.5 text-[10px] font-semibold text-lng-coral">{cd.expired ? t('loungeV2.gift.closed') : t('loungeV2.gift.closesIn', { label: cd.label })}</div>
      )}
      <div className="mt-1.5 flex gap-1">
        <button type="button" className="flex-1 rounded-lg bg-lng-navy py-1 text-[10.5px] font-bold text-white">{t('loungeV2.gift.apply')}</button>
        <button type="button" className="flex-1 rounded-lg border border-lng-line bg-white py-1 text-[10.5px] font-bold text-lng-ink">{t('loungeV2.gift.recommend')}</button>
      </div>
    </div>
  )
}

function BridesmaidSection() {
  const t = useT()
  return (
    <section className="mb-6">
      <SectionHead eyebrow="Bridesmaids · Groomsmen" title={t('loungeV2.gift.attendantsTitle')} desc={t('loungeV2.gift.attendantsDesc')} />
      <div className="grid grid-cols-3 gap-2">
        {ROLE_SLOTS_DONE.map((s) => (
          <DoneSlot key={s.id} slot={s} />
        ))}
      </div>
      <p className="mb-1.5 mt-3 px-0.5 text-[11px] font-bold text-lng-navy">{t('loungeV2.gift.openRoles')}</p>
      <div className="grid grid-cols-2 gap-2">
        {ROLE_SLOTS_PENDING.map((s) => (
          <PendingSlot key={s.id} slot={s} />
        ))}
      </div>
    </section>
  )
}

function GiftSection() {
  const t = useT()
  const cd = timeUntil(GIFT_DEADLINE)
  return (
    <section className="mb-6">
      <SectionHead eyebrow="Gifts" title={t('loungeV2.gift.giftsTitle')} desc={t('loungeV2.gift.giftsDesc')} />
      <div className="mb-3 rounded-2xl border border-lng-pink-ink/15 bg-lng-pink/50 px-3.5 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-lng-pink-ink">
          <Clock className="h-3.5 w-3.5" />
          {cd.expired ? (
            <span>{t('loungeV2.gift.wreathClosed')}</span>
          ) : (
            <span>{t('loungeV2.gift.wreathClosesIn', { label: cd.label })}</span>
          )}
        </div>
        <p className="mt-1 text-[10.5px] text-lng-muted">{t('loungeV2.gift.wreathHint')}</p>
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
                  <span className="text-[11px] font-bold"> {t('loungeV2.gift.yoneUnit')}</span>
                  <span className="ml-1.5 text-[10.5px] font-normal text-lng-muted">{t('loungeV2.gift.orCard', { krw: g.krw })}</span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" className="rounded-xl bg-lng-navy py-2 text-[12px] font-bold text-white">{t('loungeV2.gift.give')}</button>
              <button type="button" className="rounded-xl border border-lng-navy/20 bg-white py-2 text-[12px] font-bold text-lng-navy">{t('loungeV2.gift.giveTogether')}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MakersSection() {
  const t = useT()
  return (
    <section className="mb-6">
      <SectionHead eyebrow="Makers" title={t('loungeV2.gift.makersTitle')} desc={t('loungeV2.gift.makersDesc')} />
      <div className="grid grid-cols-3 gap-2">
        {VENDORS.map((v) => (
          <div key={v.id} className="flex flex-col items-center rounded-2xl border border-lng-line bg-white px-1.5 py-2.5 text-center">
            <span className="text-[22px]">{v.icon}</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-lng-muted">{v.category}</span>
            <span className="mt-0.5 text-[11px] font-bold leading-tight text-lng-ink">{v.vendor}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[10px] leading-relaxed text-lng-muted">
        {t('loungeV2.gift.makersNote')}
      </p>
    </section>
  )
}

export function GiftSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showClose className="border-lng-line bg-white text-lng-ink scrollbar-hide">
        <SheetHeader>
          <SheetTitle className="text-lng-navy">{t('loungeV2.gift.sheetTitle')}</SheetTitle>
          <SheetDescription className="text-lng-muted">{t('loungeV2.gift.sheetDesc')}</SheetDescription>
        </SheetHeader>

        <BridesmaidSection />
        <GiftSection />
        <MakersSection />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-2xl border border-lng-line bg-lng-surface py-3 text-[14px] font-bold text-lng-ink"
        >
          {t('loungeV2.gift.close')}
        </button>
      </SheetContent>
    </Sheet>
  )
}
