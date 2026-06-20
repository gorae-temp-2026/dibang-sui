// 샵(모이 꾸미기) — 모이가모인곳(④) 화면 내부 진입(레일 아님, 핸드오프 §5·§12-2).
// 구조 포팅: 보유 요네 지갑 + 카테고리 필터 + 카탈로그 그리드 + 사용 규칙(모이가모인곳_v2.0 shop 탭).
// 요네 차감 = 구매 1회 / 배치·장착 토글 무료(에셋스펙 §2). 다크 유니버스 테마(Sheet 기본).
import { useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { SHOP, type ShopItem, type EquipSlot } from './data'
import { cn } from '../../lib/utils'

type Cat = 'all' | 'interior' | 'outfit' | 'mine'
const CATS: { key: Cat; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'interior', label: '인테리어' },
  { key: 'outfit', label: '모이옷' },
  { key: 'mine', label: '내 아이템' },
]

interface ShopSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  yone: number
  owned: string[]
  placedIds: string[]
  equipped: Partial<Record<EquipSlot, string>>
  pendingItemId: string | null
  error: string | null
  onPurchase: (id: string) => void
  onPlace: (id: string) => void
  onRemove: (id: string) => void
  onEquip: (id: string) => void
  onUnequip: (slot: EquipSlot) => void
  onCharge: () => void
  onDismissError: () => void
}

export function ShopSheet(props: ShopSheetProps) {
  const { open, onOpenChange, yone, owned, placedIds, equipped, pendingItemId, error } = props
  const [cat, setCat] = useState<Cat>('all')
  const purchasing = pendingItemId != null

  const list = SHOP.filter((it) => (cat === 'all' ? true : cat === 'mine' ? owned.includes(it.id) : it.category === cat))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh]">
        <SheetHeader>
          <SheetTitle>샵 · 모이 꾸미기</SheetTitle>
        </SheetHeader>

        {/* 보유 요네 지갑 */}
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#F8C57A]/30 bg-gradient-to-br from-[#F8C57A]/14 to-transparent px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8C57A]/20 text-xl">🐚</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/45">My Yone</div>
            <div className="flex items-baseline gap-1 text-white">
              <b className="text-[22px] font-black tracking-tight">{yone.toLocaleString()}</b>
              <span className="text-[11px] text-white/55">요네</span>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onCharge}
            className="flex items-center gap-1 rounded-full bg-gradient-to-br from-[#F8C57A] to-[#E8A865] px-3.5 py-2 text-[12px] font-extrabold text-[#5a3a12]"
          >
            <Plus className="h-3.5 w-3.5" /> 충전하기
          </button>
        </div>

        {error && (
          <button
            type="button"
            onClick={props.onDismissError}
            className="mb-3 block w-full rounded-xl border border-[#E0607A]/40 bg-[#E0607A]/10 px-3 py-2 text-left text-[12px] text-[#f3b6c2]"
          >
            {error} <span className="text-white/40">(눌러 닫기)</span>
          </button>
        )}

        {/* 카테고리 필터 */}
        <div className="mb-3 flex gap-1.5">
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                cat === c.key ? 'bg-[#1E3A5F] text-white' : 'bg-white/[0.05] text-white/55',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 카탈로그 그리드 */}
        {list.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-white/40">아직 보유한 아이템이 없어요. 구매하면 여기 모여요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {list.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                owned={owned.includes(it.id)}
                placed={placedIds.includes(it.id)}
                equipped={!!it.slot && equipped[it.slot] === it.id}
                canAfford={yone >= it.yone}
                purchasing={purchasing}
                buyingThis={pendingItemId === it.id}
                onPurchase={() => props.onPurchase(it.id)}
                onPlace={() => props.onPlace(it.id)}
                onRemove={() => props.onRemove(it.id)}
                onEquip={() => props.onEquip(it.id)}
                onUnequip={() => it.slot && props.onUnequip(it.slot)}
              />
            ))}
          </div>
        )}

        {/* 사용 규칙 */}
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Item Rules</div>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-white/55">
            <li>· <b className="text-white/75">요네 차감</b>은 구매 시 1회 — 배치·장착 토글은 무료예요.</li>
            <li>· <b className="text-white/75">모이옷</b>은 슬롯(머리·몸)당 하나씩 착용.</li>
            <li>· <b className="text-white/75">인테리어</b>는 방에 배치 — 끌어서 위치를 옮길 수 있어요.</li>
            <li>· 실제 요네 충전(SUI·USDC)·결제는 백엔드 연결 단계에서 활성화돼요.</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ItemCardProps {
  item: ShopItem
  owned: boolean
  placed: boolean
  equipped: boolean
  canAfford: boolean
  purchasing: boolean
  buyingThis: boolean
  onPurchase: () => void
  onPlace: () => void
  onRemove: () => void
  onEquip: () => void
  onUnequip: () => void
}

function ItemCard({ item, owned, placed, equipped, canAfford, purchasing, buyingThis, onPurchase, onPlace, onRemove, onEquip, onUnequip }: ItemCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
      <div
        className="relative flex h-20 items-center justify-center text-3xl"
        style={{ background: `linear-gradient(140deg, ${hexCss(item.color)}55, ${hexCss(item.color)}1f)` }}
      >
        {item.emoji}
        {item.signature && (
          <span className="absolute right-2 top-2 rounded-full bg-[#F8C57A] px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#5a3a12]">시그니처</span>
        )}
        {owned && (
          <span className="absolute left-2 top-2 rounded-full bg-[#46d77f]/90 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#0a2414]">보유</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <div className="text-[12.5px] font-bold text-white">{item.name}</div>
        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-white/45">{item.desc}</p>
        <div className="mt-2">
          {!owned ? (
            <button
              type="button"
              disabled={!canAfford || purchasing}
              onClick={onPurchase}
              className={cn(
                'flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-extrabold transition-colors',
                canAfford && !purchasing ? 'bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white' : 'bg-white/[0.06] text-white/35',
              )}
            >
              {buyingThis ? (
                '구매 중…'
              ) : (
                <>
                  <Coins className="h-3.5 w-3.5 text-[#F8C57A]" /> {item.yone} {canAfford ? '구매' : '부족'}
                </>
              )}
            </button>
          ) : item.category === 'interior' ? (
            placed ? (
              <button type="button" onClick={onRemove} className="w-full rounded-lg border border-white/15 py-2 text-[12px] font-bold text-white/70">
                배치됨 · 빼기
              </button>
            ) : (
              <button type="button" onClick={onPlace} className="w-full rounded-lg bg-white/[0.08] py-2 text-[12px] font-bold text-white">
                방에 배치
              </button>
            )
          ) : equipped ? (
            <button type="button" onClick={onUnequip} className="w-full rounded-lg border border-[#F8C57A]/40 py-2 text-[12px] font-bold text-[#F8C57A]">
              착용 중 · 벗기
            </button>
          ) : (
            <button type="button" onClick={onEquip} className="w-full rounded-lg bg-white/[0.08] py-2 text-[12px] font-bold text-white">
              입기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function hexCss(c: number) {
  return `#${c.toString(16).padStart(6, '0')}`
}
