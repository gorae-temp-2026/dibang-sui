// 디방인연 받은이음 화면 — 목업 likes 스크린 포팅(관심·이음 세그).
// 이음: 받은 이음 신청(수락/거절) + 내가 보낸 이음. 관심: 나를 본 모이 + 내가 추가사진 연 모이.
// 이음 전 익명 규칙(기능정의 §5): 받은 신청은 상대가 이름·관계 먼저 공개 / 관심은 이름 잠금.
import { useState, type ReactNode } from 'react'
import { Eye, Inbox, Send } from 'lucide-react'
import type { IncomingReq, Moi } from './types'
import { cn } from '../../lib/utils'

const photoBg = (hue: number) => `linear-gradient(150deg, hsl(${hue} 52% 34%), hsl(${(hue + 36) % 360} 48% 16%))`

interface ReceivedScreenProps {
  pool: Moi[]
  incoming: IncomingReq[]
  sentIds: number[]
  unlockedIds: number[]
  onAccept: (moiId: number) => void
  onDecline: (moiId: number) => void
  onOpenProfile: (id: number) => void
}

export function ReceivedScreen({ pool, incoming, sentIds, unlockedIds, onAccept, onDecline, onOpenProfile }: ReceivedScreenProps) {
  const moiById = (id: number) => pool.find((m) => m.id === id)
  const [seg, setSeg] = useState<'ieum' | 'gwansim'>('ieum')
  const seen = unlockedIds.map(moiById).filter((m): m is NonNullable<typeof m> => !!m)

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
      <div className="mb-3 text-[17px] font-extrabold text-white">관심 · 이음</div>

      {/* 세그 */}
      <div className="mb-4 flex gap-1.5">
        <SegBtn active={seg === 'ieum'} onClick={() => setSeg('ieum')} icon={<Inbox className="h-3.5 w-3.5" />} label="이음" n={incoming.length + sentIds.length} />
        <SegBtn active={seg === 'gwansim'} onClick={() => setSeg('gwansim')} icon={<Eye className="h-3.5 w-3.5" />} label="관심" n={seen.length} />
      </div>

      {seg === 'ieum' ? (
        <>
          <SecHead label="받은 이음 신청" sub="상대가 이름·한마디를 먼저 건넸어요" />
          {incoming.length ? (
            <div className="space-y-2.5">
              {incoming.map((r) => {
                const m = moiById(r.moiId)
                if (!m) return null
                return (
                  <div key={r.moiId} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-extrabold text-white">{m.name}</div>
                      <div className="text-[11px] text-white/50">{r.rel}</div>
                      <div className="mt-1 text-[11px] text-[#9fc0dc]">{m.prov[0]?.emoji} {m.prov[0]?.text}</div>
                      <p className="mt-1 line-clamp-2 text-[12px] italic text-white/70">“{r.msg}”</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => onDecline(r.moiId)} className="flex-1 rounded-lg border border-white/15 py-2 text-[12px] font-bold text-white/60">거절</button>
                        <button type="button" onClick={() => onAccept(r.moiId)} className="flex-[1.4] rounded-lg bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] py-2 text-[12px] font-extrabold text-white">이음 수락</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Blank>받은 이음 신청이 없어요.</Blank>
          )}

          <SecHead label="내가 보낸 이음" sub="상대 수락 대기중 · 성사되면 채팅으로" className="mt-5" />
          {sentIds.length ? (
            <div className="space-y-2.5">
              {sentIds.map((id) => {
                const m = moiById(id)
                if (!m) return null
                return (
                  <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-cover bg-center blur-[6px]" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white/80">{m.name}</div>
                      <div className="text-[11px] text-white/45">{m.prov[0]?.emoji} {m.prov[0]?.text}</div>
                    </div>
                    <span className="rounded-full bg-[#F8C57A]/15 px-2.5 py-1 text-[10.5px] font-bold text-[#F8C57A]">수락 대기중</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <Blank>보낸 이음이 없어요.</Blank>
          )}
        </>
      ) : (
        <>
          <SecHead label="나를 본 모이" sub="내 사진을 본 관심 · 이름은 이음 후" />
          <Blank>아직 나를 본 모이가 없어요.</Blank>

          <SecHead label="내가 본 모이" sub="요네로 추가 사진을 연 모이" className="mt-5" />
          {seen.length ? (
            <div className="grid grid-cols-3 gap-2">
              {seen.map((m) => (
                <button key={m.id} type="button" onClick={() => onOpenProfile(m.id)} className="relative aspect-square overflow-hidden rounded-xl">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
                  <span className="absolute inset-x-0 bottom-0 bg-[#0d1621]/70 py-1 text-center text-[9px] font-bold text-white">📷 추가 사진 본 모이</span>
                </button>
              ))}
            </div>
          ) : (
            <Blank>아직 추가 사진을 연 모이가 없어요. 카드에서 🪙로 추가 사진을 열면 여기 모여요.</Blank>
          )}
        </>
      )}
    </div>
  )
}

function SegBtn({ active, onClick, icon, label, n }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; n: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors', active ? 'bg-[#1E3A5F] text-white' : 'bg-white/[0.05] text-white/55')}
    >
      {icon} {label} <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-white/20' : 'bg-white/10')}>{n}</span>
    </button>
  )
}

function SecHead({ label, sub, className }: { label: string; sub?: string; className?: string }) {
  return (
    <div className={cn('mb-2 flex items-baseline gap-2', className)}>
      <Send className="h-3.5 w-3.5 text-[#9fc0dc]" />
      <span className="text-[13px] font-bold text-white">{label}</span>
      {sub && <span className="text-[10.5px] text-white/40">{sub}</span>}
    </div>
  )
}

function Blank({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-[12px] leading-relaxed text-white/40">{children}</div>
}
