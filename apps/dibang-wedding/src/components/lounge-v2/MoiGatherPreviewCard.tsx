// 모이가 모인곳 미리보기 카드 — 히어로 카드 바로 아래(핸드오프 §12-2). 우측 레일엔 항목 없음.
// 방 배너 + ⛶ 들어가기 → 풀스크린 미니룸(MoiGatherPage). 배너는 assets/moi_scene.png 부재로 그라데이션 자리표시.
import { Maximize2 } from 'lucide-react'

export function MoiGatherPreviewCard({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="mx-4 mt-4">
      <button
        type="button"
        onClick={onEnter}
        className="block w-full overflow-hidden rounded-2xl border border-lng-line bg-white text-left shadow-[0_2px_10px_rgba(30,58,95,0.06)]"
      >
        <div className="relative h-28 w-full bg-[radial-gradient(circle_at_30%_20%,#cfe3f5,transparent_60%),radial-gradient(circle_at_80%_80%,#f6e2c7,transparent_55%),linear-gradient(135deg,#e8f1fa,#dfeaf5)]">
          <span className="absolute bottom-2.5 left-3 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold text-lng-navy backdrop-blur">
            2.5D 미니룸
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold text-lng-navy">모이가 모인곳</div>
            <div className="mt-0.5 text-[12px] text-lng-muted">결혼식·하객·신뢰 네트워크를 모이로 만나요.</div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-lng-navy px-3.5 py-2 text-[12px] font-bold text-white">
            <Maximize2 className="h-4 w-4" /> 들어가기
          </span>
        </div>
      </button>
    </section>
  )
}
