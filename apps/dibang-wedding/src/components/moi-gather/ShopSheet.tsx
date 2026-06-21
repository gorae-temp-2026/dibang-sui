// 샵(모이 꾸미기) — 모이가모인곳(④) 광장 화면 내부 진입(레일 아님, 핸드오프 §5).
// 구매 = '내 아이템'(owned)으로만 이동(즉시 착용/배치 안 함). 착용/배치는 '내 아이템' 탭에서 미리보기→확정.
// 인테리어·소품 = 다중 구매·배치(보유 수 한도). 헤어·옷·액세서리 = 1개(전환·착용). 다크 시트.
import { useState } from 'react'
import { Coins, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { SHOP, ITEM_BY_ID, type ShopItem, type EquipSlot } from './data'
import type { PlacedItem } from '../../machines/moiPlaza.machine'
import { cn } from '../../lib/utils'

type Cat = 'all' | 'hair' | 'clothes' | 'interior' | 'accessory' | 'mine'
const CATS: { key: Cat; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'hair', label: '헤어' },
  { key: 'clothes', label: '옷' },
  { key: 'interior', label: '인테리어' },
  { key: 'accessory', label: '액세서리' },
  { key: 'mine', label: '내 아이템' },
]

const slotKey = (slot?: EquipSlot): 'head' | 'body' | 'acc' => (slot === 'head' ? 'head' : slot === 'body' ? 'body' : 'acc')

interface ShopSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  yone: number
  owned: string[]
  placed: PlacedItem[]
  equipped: Partial<Record<EquipSlot, string>>
  pendingItemId: string | null
  error: string | null
  onPurchase: (id: string) => void
  onPlace: (id: string) => void
  onRemove: (uid: string) => void
  onEquip: (id: string) => void
  onUnequip: (slot: EquipSlot) => void
  onCharge: () => void
  onDismissError: () => void
}

function Tabs({ cat, setCat }: { cat: Cat; setCat: (c: Cat) => void }) {
  return (
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
      {CATS.map((c) => (
        <button key={c.key} type="button" onClick={() => setCat(c.key)} className={cn('flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors', cat === c.key ? 'bg-[#1E3A5F] text-white' : 'bg-white/[0.05] text-white/55')}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

// 모이 미리보기 — body(발 바닥)+head(목 겹침)+acc(부위) PNG 합성(광장 기하 근사).
function MoiPreview({ head, body, acc }: { head?: string; body?: string; acc?: string }) {
  const u = (id?: string) => (id ? ITEM_BY_ID[id]?.url : undefined)
  const bodyU = u(body)
  const headU = u(head)
  const accU = u(acc)
  const accAnchor = acc ? ITEM_BY_ID[acc]?.anchor : undefined
  const accTop = accAnchor === 'top' ? '0%' : accAnchor === 'forehead' ? '11%' : accAnchor === 'eyes' ? '19%' : accAnchor === 'neck' ? '40%' : accAnchor === 'chest' ? '50%' : '14%'
  return (
    <div className="relative mx-auto h-44 w-32">
      {bodyU && <img src={bodyU} alt="" className="absolute bottom-0 left-1/2 h-[72%] -translate-x-1/2 object-contain" draggable={false} />}
      {accAnchor === 'back' && accU && <img src={accU} alt="" className="absolute left-1/2 top-[26%] h-[40%] -translate-x-1/2 object-contain opacity-90" draggable={false} />}
      {headU && <img src={headU} alt="" className="absolute left-1/2 top-0 h-[50%] -translate-x-1/2 object-contain" draggable={false} />}
      {accAnchor !== 'back' && accU && <img src={accU} alt="" className="absolute left-1/2 h-[24%] -translate-x-1/2 object-contain" style={{ top: accTop }} draggable={false} />}
    </div>
  )
}

export function ShopSheet(props: ShopSheetProps) {
  const { open, onOpenChange, yone, owned, placed, equipped, pendingItemId, error } = props
  const [cat, setCat] = useState<Cat>('all')
  const [preview, setPreview] = useState<Partial<Record<'head' | 'body' | 'acc', string>>>({})
  const purchasing = pendingItemId != null

  const ownedCount = (id: string) => owned.filter((i) => i === id).length
  const placedCount = (id: string) => placed.filter((p) => p.itemId === id).length

  // ── 내 아이템 탭: 모이 미리보기 + 보유 리스트(착용 미리보기→확정 / 인테리어 배치) ──
  if (cat === 'mine') {
    const pv = { head: preview.head ?? equipped.head, body: preview.body ?? equipped.body, acc: preview.acc ?? equipped.acc }
    const uniq = [...new Set(owned)]
    const wearables = uniq.map((id) => ITEM_BY_ID[id]).filter((it): it is ShopItem => !!it && !!it.slot)
    const interiors = uniq.map((id) => ITEM_BY_ID[id]).filter((it): it is ShopItem => !!it && it.category === 'interior')
    const hasPreview = !!(preview.head || preview.body || preview.acc)
    const confirm = () => {
      if (preview.head) props.onEquip(preview.head)
      if (preview.body) props.onEquip(preview.body)
      if (preview.acc) props.onEquip(preview.acc)
      setPreview({})
    }
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[88vh] scrollbar-hide">
          <SheetHeader><SheetTitle>샵 · 내 아이템</SheetTitle></SheetHeader>
          <Tabs cat={cat} setCat={setCat} />

          <div className="mb-3 rounded-2xl border border-white/8 bg-[#f4f1ea] py-3">
            <MoiPreview head={pv.head} body={pv.body} acc={pv.acc} />
            <p className="mt-1 text-center text-[11px] text-[#5a4a3a]">{hasPreview ? '미리보기 — 확정하면 적용돼요' : '내 모이'}</p>
          </div>
          {hasPreview && (
            <button type="button" onClick={confirm} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] py-3 text-[14px] font-extrabold text-white">
              <Check className="h-4 w-4" /> 확정 · 모이에 적용
            </button>
          )}

          {wearables.length > 0 && (
            <>
              <p className="mb-1.5 text-[11px] font-bold text-white/50">입기 · 갈아입기</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {wearables.map((it) => {
                  const k = slotKey(it.slot)
                  const wornNow = equipped[it.slot!] === it.id && !preview[k]
                  const inPreview = preview[k] === it.id
                  return (
                    <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                      <div className="flex h-20 items-center justify-center bg-[#f4f1ea]"><img src={it.url} alt={it.name} className="h-16 w-16 object-contain" draggable={false} /></div>
                      <div className="p-2">
                        <div className="truncate text-[12px] font-bold text-white">{it.name}</div>
                        {wornNow ? (
                          it.slot === 'acc' ? (
                            <button type="button" onClick={() => props.onUnequip('acc')} className="mt-1.5 w-full rounded-lg border border-[#F8C57A]/40 py-1.5 text-[11px] font-bold text-[#F8C57A]">착용 중 · 벗기</button>
                          ) : (
                            <div className="mt-1.5 w-full rounded-lg border border-[#F8C57A]/40 py-1.5 text-center text-[11px] font-bold text-[#F8C57A]">착용 중</div>
                          )
                        ) : (
                          <button type="button" onClick={() => setPreview((p) => ({ ...p, [k]: it.id }))} className={cn('mt-1.5 w-full rounded-lg py-1.5 text-[11px] font-bold', inPreview ? 'bg-[#5AA3D6] text-white' : 'bg-white/[0.08] text-white')}>{inPreview ? '미리보기 중' : '입어보기'}</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {interiors.length > 0 && (
            <>
              <p className="mb-1.5 text-[11px] font-bold text-white/50">광장에 배치</p>
              <div className="grid grid-cols-2 gap-2 pb-1">
                {interiors.map((it) => {
                  const have = ownedCount(it.id)
                  const placedN = placedCount(it.id)
                  const canPlace = placedN < have
                  return (
                    <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                      <div className="flex h-20 items-center justify-center bg-[#f4f1ea]"><img src={it.url} alt={it.name} className="h-16 w-16 object-contain" draggable={false} /></div>
                      <div className="p-2">
                        <div className="truncate text-[12px] font-bold text-white">{it.name} <span className="text-white/45">{placedN}/{have}</span></div>
                        <button type="button" disabled={!canPlace} onClick={() => props.onPlace(it.id)} className={cn('mt-1.5 w-full rounded-lg py-1.5 text-[11px] font-bold', canPlace ? 'bg-white/[0.08] text-white' : 'bg-white/[0.04] text-white/30')}>{canPlace ? '광장에 배치' : '모두 배치됨'}</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {placed.length > 0 && (
                <div className="mt-2 mb-2 rounded-xl bg-white/[0.03] p-2.5">
                  <p className="mb-1.5 text-[10.5px] font-bold text-white/45">배치됨 — 광장에서 끌어 옮기거나 여기서 빼기</p>
                  <div className="flex flex-wrap gap-1.5">
                    {placed.map((p) => (
                      <button key={p.uid} type="button" onClick={() => props.onRemove(p.uid)} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10.5px] text-white/70">{ITEM_BY_ID[p.itemId]?.name} ✕</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {owned.length === 0 && <p className="py-10 text-center text-[12.5px] text-white/40">아직 보유한 아이템이 없어요. 카탈로그에서 구매하면 여기 모여요.</p>}
        </SheetContent>
      </Sheet>
    )
  }

  // ── 카탈로그 탭: 구매(→ 내 아이템). 인테리어·소품은 다중 구매. ──
  const list = SHOP.filter((it) => (cat === 'all' ? true : it.category === cat))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] scrollbar-hide">
        <SheetHeader><SheetTitle>샵 · 모이 꾸미기</SheetTitle></SheetHeader>

        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#4DA2FF]/30 bg-gradient-to-br from-[#4DA2FF]/14 to-transparent px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4DA2FF]/20 text-xl">💧</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/45">My SUI</div>
            <div className="flex items-baseline gap-1 text-white"><b className="text-[22px] font-black tracking-tight">{(yone / 1000).toFixed(3)}</b><span className="text-[11px] text-white/55">SUI</span></div>
            <div className="text-[10px] text-white/35">아이템 구매 시 0.001 SUI 결제</div>
          </div>
        </div>

        {error && <button type="button" onClick={props.onDismissError} className="mb-3 block w-full rounded-xl border border-[#E0607A]/40 bg-[#E0607A]/10 px-3 py-2 text-left text-[12px] text-[#f3b6c2]">{error} <span className="text-white/40">(눌러 닫기)</span></button>}

        <Tabs cat={cat} setCat={setCat} />

        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {list.map((it) => {
            const have = ownedCount(it.id)
            const multi = it.category === 'interior'
            const canAfford = yone >= it.yone
            const ownedNonMulti = have > 0 && !multi
            return (
              <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                <div className="relative flex h-24 items-center justify-center bg-[#f4f1ea]">
                  <img src={it.url} alt={it.name} className="h-[88px] w-[88px] object-contain" draggable={false} />
                  {it.isDefault && <span className="absolute left-2 top-2 rounded-full bg-white/80 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#5a3a12]">기본</span>}
                  {have > 0 && !it.isDefault && <span className="absolute left-2 top-2 rounded-full bg-[#46d77f]/90 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#0a2414]">보유{multi && have > 1 ? ` ${have}` : ''}</span>}
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <div className="truncate text-[12.5px] font-bold text-white">{it.name}</div>
                  <div className="mt-2">
                    {ownedNonMulti || it.isDefault ? (
                      <div className="w-full rounded-lg border border-white/12 py-2 text-center text-[12px] font-bold text-white/45">{it.isDefault ? '기본 제공' : '보유 중'}</div>
                    ) : (
                      <button type="button" disabled={!canAfford || purchasing} onClick={() => props.onPurchase(it.id)} className={cn('flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-extrabold transition-colors', canAfford && !purchasing ? 'bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white' : 'bg-white/[0.06] text-white/35')}>
                        {pendingItemId === it.id ? '구매 중…' : (<><Coins className="h-3.5 w-3.5 text-[#F8C57A]" /> {it.yone} {canAfford ? (multi && have > 0 ? '더 구매' : '구매') : '부족'}</>)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
