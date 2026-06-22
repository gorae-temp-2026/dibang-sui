// 선물 고르기 시트 — 채팅 '선물' 버튼에서 진입(인연·라운지 공통).
// 선물하기(샵): SHOP 카탈로그 + 온체인 purchase_item(SUI 결제)으로 구매.
// 받은선물: 온체인 getOwnedMoiItems로 내 소유 MoiItem 조회.
import { useState } from 'react'
import { Coins } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { SHOP, ITEM_BY_ID } from './data'
import { cn } from '../../lib/utils'
import type { MoiItemOnChain } from '@gorae/sui-sdk'

interface GiftPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  toName: string
  yone: number
  /** 온체인 SUI 잔액 (SUI 단위). */
  suiBalance: number
  received: string[]
  ownedOnchainItems: MoiItemOnChain[]
  pendingItemId: string | null
  error: string | null
  onGift: (itemId: string) => void
  onPurchase: (name: string, itemType: string, slot: string) => Promise<void>
  onCharge: () => void
  onDismissError: () => void
}

export function GiftPicker(props: GiftPickerProps) {
  const { open, onOpenChange, toName, suiBalance, received, ownedOnchainItems, pendingItemId, error } = props
  const [tab, setTab] = useState<'send' | 'received'>('send')
  const sending = pendingItemId != null
  const offchainInv = received.map((id) => ITEM_BY_ID[id]).filter(Boolean)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh]">
        <SheetHeader>
          <SheetTitle>🎁 {toName}에게 선물</SheetTitle>
        </SheetHeader>

        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#4DA2FF]/30 bg-gradient-to-br from-[#4DA2FF]/14 to-transparent px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4DA2FF]/20 text-xl">💧</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/45">My SUI</div>
            <div className="flex items-baseline gap-1 text-white">
              <b className="text-[22px] font-black tracking-tight">{suiBalance.toFixed(4)}</b>
              <span className="text-[11px] text-white/55">SUI</span>
            </div>
            <div className="text-[10px] text-white/35">아이템 구매 시 0.001 SUI 결제</div>
          </div>
        </div>

        {error && (
          <button type="button" onClick={props.onDismissError} className="mb-3 block w-full rounded-xl border border-[#E0607A]/40 bg-[#E0607A]/10 px-3 py-2 text-left text-[12px] text-[#f3b6c2]">
            {error} <span className="text-white/40">(눌러 닫기)</span>
          </button>
        )}

        <div className="mb-3 flex gap-1.5">
          <button type="button" onClick={() => setTab('send')} className={cn('rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors', tab === 'send' ? 'bg-[#1E3A5F] text-white' : 'bg-white/[0.05] text-white/55')}>선물하기</button>
          <button type="button" onClick={() => setTab('received')} className={cn('rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors', tab === 'received' ? 'bg-[#1E3A5F] text-white' : 'bg-white/[0.05] text-white/55')}>받은 선물 <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{ownedOnchainItems.length + offchainInv.length}</span></button>
        </div>

        {tab === 'send' ? (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {SHOP.map((it) => {
              const afford = suiBalance >= 0.001
              return (
                <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                  <div className="flex h-24 items-center justify-center bg-[#f4f1ea]">
                    <img src={it.url} alt={it.name} className="h-[84px] w-[84px] object-contain" draggable={false} />
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <div className="truncate text-[12.5px] font-bold text-white">{it.name}</div>
                    <button
                      type="button"
                      disabled={!afford || sending}
                      onClick={() => props.onGift(it.id)}
                      className={cn('mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-extrabold transition-colors', afford && !sending ? 'bg-gradient-to-br from-[#4DA2FF] to-[#2E7BD6] text-white' : 'bg-white/[0.06] text-white/35')}
                    >
                      {pendingItemId === it.id ? '보내는 중…' : (<><Coins className="h-3.5 w-3.5" /> 0.001 SUI 선물</>)}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : ownedOnchainItems.length === 0 && offchainInv.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-white/40">아직 받은 선물이 없어요. 받으면 여기 모이고, 광장 꾸미기에서 쓸 수 있어요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {ownedOnchainItems.map((oi) => (
              <div key={oi.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#46d77f]/30 bg-white/[0.04]">
                <div className="relative flex h-24 items-center justify-center bg-[#f4f1ea]">
                  <div className="text-3xl">🎁</div>
                  <span className="absolute left-2 top-2 rounded-full bg-[#46d77f]/90 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#0a2414]">온체인</span>
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <div className="truncate text-[12.5px] font-bold text-white">{oi.name}</div>
                  <div className="mt-1 text-[10.5px] text-white/45">{oi.slot} · {oi.id.slice(0, 8)}…</div>
                </div>
              </div>
            ))}
            {offchainInv.map((it) => (
              <div key={it!.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                <div className="relative flex h-24 items-center justify-center bg-[#f4f1ea]">
                  <img src={it!.url} alt={it!.name} className="h-[84px] w-[84px] object-contain" draggable={false} />
                  <span className="absolute left-2 top-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white/60">오프체인</span>
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <div className="truncate text-[12.5px] font-bold text-white">{it!.name}</div>
                  <div className="mt-1 text-[10.5px] text-white/45">광장 꾸미기에서 사용 가능</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/55">
          선물은 <b className="text-white/75">증여 신뢰 신호(EM·CS)</b>로 상대 프로필에 쌓여요. 요네 결제 자체는 화폐라 신호에서 제외돼요(§13-2).
          <span className="text-white/35"> · 온체인 attestation·Moi Credit 재계산은 연결 단계에서.</span>
        </p>
      </SheetContent>
    </Sheet>
  )
}
