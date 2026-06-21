// 매칭 범위(관계 거리) 시트 — 1다리~6다리. 보는 건 무료(기능정의 §2·§5). 물리거리 아님.
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const degLabel = (n: number) => (n >= 6 ? '6다리 이상' : `${n}다리`)

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  degMin: number
  degMax: number
  onApply: (degMin: number, degMax: number) => void
}

export function FilterSheet({ open, onOpenChange, degMin, degMax, onApply }: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>매칭 범위 · 관계 거리</SheetTitle>
          <SheetDescription>몇 다리 건너까지 볼지 정해요. 보는 건 무료예요.</SheetDescription>
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
  const [lo, setLo] = useState(degMin)
  const [hi, setHi] = useState(degMax)
  const a = Math.min(lo, hi)
  const b = Math.max(lo, hi)
  const pct = (n: number) => ((n - 1) / 5) * 100
  // 한 줄 dual-thumb 슬라이더 — 두 input[range]를 한 트랙에 겹침(트랙 투명·thumb만 조작).
  const thumb =
    'pointer-events-none absolute left-0 top-0 h-6 w-full appearance-none bg-transparent ' +
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white'

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 text-center text-[15px] font-extrabold text-[#EAF2F9]">
          {degLabel(a)} ~ {degLabel(b)}
          {a === 1 && b === 6 ? ' · 전체' : ''}
        </div>

        {/* 한 줄 범위 슬라이더(가까운 이음 ~ 낯선 사람, 두 손잡이로 1~6다리) */}
        <div className="relative mx-1 h-6">
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/15" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#87CEEB] to-[#F8C57A]"
            style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }}
          />
          <input
            type="range"
            min={1}
            max={6}
            value={lo}
            onChange={(e) => setLo(Number(e.target.value))}
            aria-label="가까운 쪽"
            className={`${thumb} [&::-webkit-slider-thumb]:bg-[#87CEEB] [&::-moz-range-thumb]:bg-[#87CEEB]`}
          />
          <input
            type="range"
            min={1}
            max={6}
            value={hi}
            onChange={(e) => setHi(Number(e.target.value))}
            aria-label="먼 쪽"
            className={`${thumb} [&::-webkit-slider-thumb]:bg-[#F8C57A] [&::-moz-range-thumb]:bg-[#F8C57A]`}
          />
        </div>
        <div className="mt-2.5 flex justify-between px-0.5 text-[10.5px] text-white/45">
          <span>가까운 이음</span>
          <span>낯선 사람</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(a, b)}
        className="mt-4 w-full rounded-2xl bg-[#1E3A5F] py-3.5 text-[14.5px] font-extrabold text-white"
      >
        이 범위로 보기
      </button>
    </>
  )
}
