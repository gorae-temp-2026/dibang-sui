// 매칭 범위(관계 거리) 시트 — 1다리~6다리. 보는 건 무료(기능정의 §2·§5). 물리거리 아님.
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import { useT } from '../../lib/i18n'

type TFn = (key: string, vars?: Record<string, string | number>) => string
const degLabel = (t: TFn, n: number) => (n >= 6 ? t('inyeon.filter.degMax') : t('inyeon.filter.deg', { n }))

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  degMin: number
  degMax: number
  onApply: (degMin: number, degMax: number) => void
}

export function FilterSheet({ open, onOpenChange, degMin, degMax, onApply }: FilterSheetProps) {
  const t = useT()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{t('inyeon.filter.title')}</SheetTitle>
          <SheetDescription>{t('inyeon.filter.desc')}</SheetDescription>
        </SheetHeader>
        {/* Radix가 닫힐 때 content를 언마운트 → 열 때마다 FilterBody가 새로 마운트되어 현재 범위로 초기화. */}
        <FilterBody
          degMin={degMin}
          degMax={degMax}
          onApply={(a, b) => {
            onApply(a, b)
            onOpenChange(false)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

function FilterBody({ degMin, degMax, onApply }: { degMin: number; degMax: number; onApply: (a: number, b: number) => void }) {
  const t = useT()
  const [lo, setLo] = useState(degMin)
  const [hi, setHi] = useState(degMax)
  const a = Math.min(lo, hi)
  const b = Math.max(lo, hi)

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 text-center text-[15px] font-extrabold text-[#EAF2F9]">
          {degLabel(t, a)} ~ {degLabel(t, b)}
          {a === 1 && b === 6 ? ` · ${t('inyeon.filter.all')}` : ''}
        </div>

        <label className="mb-1 block text-[11px] font-bold text-white/55">{t('inyeon.filter.near')}</label>
        <input
          type="range"
          min={1}
          max={6}
          value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          className="mb-4 w-full accent-[#87CEEB]"
        />
        <label className="mb-1 block text-[11px] font-bold text-white/55">{t('inyeon.filter.far')}</label>
        <input
          type="range"
          min={1}
          max={6}
          value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          className="w-full accent-[#F8C57A]"
        />
      </div>

      <button
        type="button"
        onClick={() => onApply(a, b)}
        className="mt-4 w-full rounded-2xl bg-[#1E3A5F] py-3.5 text-[14.5px] font-extrabold text-white"
      >
        {t('inyeon.filter.apply')}
      </button>
    </>
  )
}
