// 디방인연 채팅 화면 — 목업 chat 스크린 포팅. 메모리 스트립(이음된 모이 짧은 영상) + 대화(DM) 목록.
// 대화 열기 = 관계 거리별 요네 게이트 + 방/메모리 네비 + 메시지/자동응답 → 전부 inyeonMachine이 소유.
// 이 컴포넌트는 머신 context(dms·dmRoomId·memoryId)와 send 콜백만 받아 그리는 표현 계층이다.
// ★ 모든 대화(DM)는 인연(유니버스)에서 — 라운지에서 이음해도 대화는 여기(핸드오프 §12-3).
import { useState } from 'react'
import { useSelector } from '@xstate/react'
import { ArrowLeft, Gift, Lock, Play, Send, X } from 'lucide-react'
import { MOI_MEM } from './data'
import type { Moi } from './types'
import type { Note } from '../../hooks/useNotes'
import type { MoiItemOnChain } from '@gorae/sui-sdk'
import type { OnchainGiftEntry } from '../../hooks/useGiftLog'
import { giftActor, type GiftEvent } from '../../machines/gift.machine'
import { GiftPicker } from '../moi-gather/GiftPicker'
import { ITEM_BY_ID } from '../moi-gather/data'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

const photoBg = (hue: number) => `linear-gradient(150deg, hsl(${hue} 52% 34%), hsl(${(hue + 36) % 360} 48% 16%))`

interface ChatScreenProps {
  pool: Moi[]
  matchedIds: number[]
  chatOpen: Record<number, boolean>
  dmRoomId: number | null
  memoryId: number | null
  ownedOnchainItems: MoiItemOnChain[]
  suiBalance: number
  onPurchase: (name: string, itemType: string, slot: string) => Promise<void>
  onSendOnchainGift: (recipientAddress: string) => Promise<void>
  onOpenDmRoom: (id: number) => void
  onCloseDmRoom: () => void
  onOpenMemory: (id: number) => void
  onCloseMemory: () => void
  onSendDm: (id: number, text: string) => void
  onOpenProfile: (id: number) => void
  notes: Note[]
  myAddress: string | null
  onchainGiftLog: OnchainGiftEntry[]
}

export function ChatScreen({
  pool,
  matchedIds,
  chatOpen,
  ownedOnchainItems,
  suiBalance,
  onPurchase,
  onSendOnchainGift,
  dmRoomId,
  memoryId,
  onOpenDmRoom,
  onCloseDmRoom,
  onOpenMemory,
  onCloseMemory,
  onSendDm,
  onOpenProfile,
  notes,
  myAddress,
  onchainGiftLog,
}: ChatScreenProps) {
  const t = useT()
  // 선물 = 전역 giftActor 소유(인연 채팅 송신 ↔ 광장 수신 공유). DM 상태는 inyeonMachine 소유(props).
  const [giftOpen, setGiftOpen] = useState(false)
  const giftLog = useSelector(giftActor, (s) => s.context.log)
  const giftYone = useSelector(giftActor, (s) => s.context.yone)
  const giftReceived = useSelector(giftActor, (s) => s.context.received)
  const giftPending = useSelector(giftActor, (s) => s.context.pending?.itemId ?? null)
  const giftError = useSelector(giftActor, (s) => s.context.error)

  const moiById = (id: number) => pool.find((m) => m.id === id)

  const sendGift = async (toId: number, itemId: string) => {
    const m = moiById(toId)
    const suiAddress = m && (m as Moi & { suiAddress?: string }).suiAddress
    giftActor.send({ type: 'SEND_GIFT', itemId, toId: suiAddress ?? String(toId), toName: m?.name ?? t('inyeon.chat.someone') })
    if (suiAddress) {
      try {
        await onSendOnchainGift(suiAddress)
      } catch (e) {
        console.error('[gift] onchain gift failed:', e)
        alert(`선물 전송 실패: ${(e as Error).message?.slice(0, 80) ?? '알 수 없는 오류'}`)
      }
    }
  }

  const matched = matchedIds.map(moiById).filter((m): m is NonNullable<typeof m> => !!m)

  if (matched.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="text-lg font-extrabold text-white">{t('inyeon.chat.memoryDm')}</div>
        <p className="text-[12.5px] leading-relaxed text-white/50">
          {t('inyeon.chat.emptyLine1')}<br />{t('inyeon.chat.emptyLine2')}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
      {/* 메모리 스트립 */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[14px] font-extrabold text-white">🎞️ {t('inyeon.chat.memory')}</span>
        <span className="text-[10.5px] text-white/40">{t('inyeon.chat.memorySub')}</span>
      </div>
      <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
        {matched.map((m) => (
          <button key={m.id} type="button" onClick={() => onOpenMemory(m.id)} className="flex flex-shrink-0 flex-col items-center gap-1">
            <span className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-[#F8C57A] to-[#5AA3D6] p-[2.5px]">
              <span className="h-full w-full rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
              <Play className="absolute h-4 w-4 fill-white text-white drop-shadow" />
            </span>
            <span className="text-[10px] font-bold text-white/80">{m.name}</span>
          </button>
        ))}
      </div>

      {/* 대화 목록 */}
      <div className="mb-2 text-[14px] font-extrabold text-white">{t('inyeon.chat.dm')}</div>
      <div className="space-y-2">
        {matched.map((m) => {
          const open = !!chatOpen[m.id]
          const cost = m.tier === 0 ? 0 : m.tier === 1 ? 0.001 : 0.005
          return (
            <div key={m.id} className={cn('flex items-center gap-3 rounded-2xl border p-3', open ? 'border-white/8 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]')}>
              <div className="relative h-12 w-12 flex-shrink-0 rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }}>
                {m.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A1626] bg-[#46d77f]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-white">
                  {m.name}
                  {open && <span className="rounded bg-[#F8C57A]/20 px-1.5 py-0.5 text-[9px] font-extrabold text-[#F8C57A]">{t('inyeon.ieum')}</span>}
                </div>
                <div className="text-[11.5px] text-white/45">{open ? t('inyeon.chat.startConversation') : t('inyeon.chat.ieumAcceptedOpen', { cost })}</div>
              </div>
              {open ? (
                <button type="button" onClick={() => onOpenDmRoom(m.id)} className="rounded-lg bg-white/[0.08] px-3 py-2 text-[11.5px] font-bold text-white">{t('inyeon.chat.open')}</button>
              ) : (
                <button type="button" onClick={() => onOpenDmRoom(m.id)} className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] px-3 py-2 text-[11.5px] font-extrabold text-white">
                  <Lock className="h-3 w-3" /> 💧{cost} SUI
                </button>
              )}
            </div>
          )
        })}
      </div>

      {dmRoomId != null && (
        <DmRoom
          moiId={dmRoomId}
          pool={pool}
          notes={(() => {
            const m = moiById(dmRoomId)
            const addr = m && (m as Moi & { suiAddress?: string }).suiAddress
            if (!addr || !myAddress) return []
            return notes.filter((n) => (n.from === addr && n.to === myAddress) || (n.from === myAddress && n.to === addr))
          })()}
          myAddress={myAddress}
          giftLog={giftLog.filter((g) => g.counterpartId === String(dmRoomId))}
          onchainGifts={(() => {
            const m = moiById(dmRoomId)
            const addr = m && (m as Moi & { suiAddress?: string }).suiAddress
            return addr ? onchainGiftLog.filter((g) => g.actor === addr || g.target === addr) : []
          })()}
          onSend={(t) => onSendDm(dmRoomId, t)}
          onClose={onCloseDmRoom}
          onOpenProfile={() => onOpenProfile(dmRoomId)}
          onOpenGift={() => setGiftOpen(true)}
        />
      )}
      {dmRoomId != null && giftOpen && (
        <GiftPicker
          open={giftOpen}
          onOpenChange={setGiftOpen}
          toName={moiById(dmRoomId)?.name ?? t('inyeon.chat.someone')}
          yone={giftYone}
          received={giftReceived}
          ownedOnchainItems={ownedOnchainItems}
          suiBalance={suiBalance}
          pendingItemId={giftPending}
          onPurchase={onPurchase}
          error={giftError}
          onGift={(itemId) => sendGift(dmRoomId, itemId)}
          onCharge={() => giftActor.send({ type: 'CHARGE' })}
          onDismissError={() => giftActor.send({ type: 'DISMISS_ERROR' })}
        />
      )}
      {memoryId != null && <MemoryViewer moiId={memoryId} pool={pool} onClose={onCloseMemory} />}
    </div>
  )
}

function DmRoom({ moiId, pool, notes, myAddress, giftLog, onchainGifts, onSend, onClose, onOpenProfile, onOpenGift }: { moiId: number; pool: Moi[]; notes: Note[]; myAddress: string | null; giftLog: GiftEvent[]; onchainGifts: OnchainGiftEntry[]; onSend: (t: string) => void; onClose: () => void; onOpenProfile: () => void; onOpenGift: () => void }) {
  const t = useT()
  const [text, setText] = useState('')
  const m = pool.find((p) => p.id === moiId)
  if (!m) return null
  const submit = () => {
    const v = text.trim()
    if (!v) return
    onSend(v)
    setText('')
  }
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0A1626]">
      <header className="flex items-center gap-2.5 border-b border-white/8 px-3 py-3">
        <button type="button" aria-label={t('inyeon.chat.back')} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={onOpenProfile} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="h-9 w-9 flex-shrink-0 rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
          <span className="min-w-0 text-left">
            <span className="block truncate text-[14px] font-bold text-white">{m.name}</span>
            <span className="block text-[10.5px] text-white/45">{m.online ? t('inyeon.online') : t('inyeon.offline')} · {t('inyeon.chat.tapForProfile')}</span>
          </span>
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {notes.length === 0 && (
          <div className="mx-auto max-w-[85%] rounded-xl bg-white/[0.04] px-3 py-2 text-center text-[10.5px] leading-relaxed text-white/45">
            {t('inyeon.chat.notesOnchain')}
          </div>
        )}
        {notes.map((note, i) =>
          note.from === myAddress ? (
            <div key={`n${i}`} className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] px-3.5 py-2 text-[13px] text-white">{note.text}</div>
          ) : (
            <div key={`n${i}`} className="mr-auto max-w-[78%] rounded-2xl rounded-bl-md bg-white/[0.08] px-3.5 py-2 text-[13px] text-white">{note.text}</div>
          ),
        )}
        {giftLog.map((g) => (
          <div key={`g${g.id}`} className="mx-auto flex max-w-[88%] items-center gap-2 rounded-xl border border-[#F8C57A]/30 bg-[#F8C57A]/10 px-3 py-2">
            <img src={ITEM_BY_ID[g.itemId]?.url} alt="" className="h-9 w-9 flex-shrink-0 object-contain" />
            <span className="text-[11.5px] leading-snug text-white/85">
              {g.fromMe
                ? t('inyeon.chat.giftSent', { name: m.name, item: ITEM_BY_ID[g.itemId]?.name ?? t('inyeon.chat.gift') })
                : t('inyeon.chat.giftReceived', { name: m.name, item: ITEM_BY_ID[g.itemId]?.name ?? t('inyeon.chat.gift') })}
              <b className="ml-1 text-[#F8C57A]">💝 {t('inyeon.chat.trustSignalPlus')}</b>
            </span>
          </div>
        ))}
        {onchainGifts.length > 0 && (
          <div className="mx-auto max-w-[85%] rounded-xl bg-[#46d77f]/10 px-3 py-2 text-center text-[10.5px] text-[#46d77f]">🔗 {t('inyeon.chat.onchainGiftLog', { n: onchainGifts.length })}</div>
        )}
        {onchainGifts.map((g, i) => (
          <div key={`og${i}`} className="mx-auto flex max-w-[88%] items-center gap-2 rounded-xl border border-[#46d77f]/30 bg-[#46d77f]/10 px-3 py-2">
            <span className="text-2xl">🎁</span>
            <span className="text-[11.5px] leading-snug text-white/85">
              {g.fromMe ? t('inyeon.chat.onchainGiftSent', { name: m.name }) : t('inyeon.chat.onchainGiftReceived', { name: m.name })}
              <b className="ml-1 text-[#46d77f]">💎 {t('inyeon.chat.giftTrustSignalOnchain')}</b>
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2.5">
        <button type="button" aria-label={t('inyeon.chat.giftAria')} onClick={onOpenGift} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F8C57A]/15 text-[#F8C57A]">
          <Gift className="h-[18px] w-[18px]" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('inyeon.chat.messagePlaceholder')}
          className="flex-1 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:outline-none"
        />
        <button type="button" aria-label={t('inyeon.chat.send')} onClick={submit} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function MemoryViewer({ moiId, pool, onClose }: { moiId: number; pool: Moi[]; onClose: () => void }) {
  const t = useT()
  const m = pool.find((p) => p.id === moiId)
  if (!m) return null
  const views = (moiId % 30) + 12
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur" onClick={onClose}>
      <div className="relative flex-1 bg-cover bg-center" style={{ background: photoBg(m.photos[1]?.hue ?? m.photos[0]?.hue ?? 210) }}>
        <button type="button" aria-label={t('inyeon.chat.close')} onClick={onClose} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-black/55 to-transparent p-4">
          <span className="h-10 w-10 rounded-full border-2 border-white/70 bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
          <div className="leading-tight">
            <div className="text-[14px] font-extrabold text-white">{m.name}</div>
            <div className="text-[11px] text-white/70">{t('inyeon.chat.memoryViews', { views })}</div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 pb-8">
          <p className="text-[14px] font-bold text-white">{MOI_MEM[moiId] ?? t('inyeon.chat.recentMemory')}</p>
        </div>
      </div>
    </div>
  )
}
