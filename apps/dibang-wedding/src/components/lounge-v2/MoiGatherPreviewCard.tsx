// 모이가 모인곳 미리보기 카드 — 히어로 카드 바로 아래(핸드오프 §12-2).
// 카드 썸네일 = 모이가모인곳 정적 스냅샷(호스트 신랑·신부 + 하객들이 광장에 모인 정지 이미지, 손그림 에셋 합성).
// 탭 또는 우측하단 ⛶(유튜브식 전체화면) → 풀 광장(MoiGatherPage).
import { Maximize } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

// 손그림 모이 합성 — body(발=바닥) 위에 head(목 겹침). 캔버스 neck 기하 근사(300×690 / 300×340).
function MoiFigure({ head, body, className }: { head: string; body: string; className?: string }) {
  return (
    <div className={cn('absolute bottom-0', className)}>
      <div className="relative w-full" style={{ aspectRatio: '300 / 712' }}>
        <img src={`/assets/moi/bodies/${body}.png`} alt="" draggable={false} className="absolute inset-x-0 w-full" style={{ top: '3%' }} />
        <img src={`/assets/moi/heads/${head}.png`} alt="" draggable={false} className="absolute inset-x-0 top-0 w-full" />
      </div>
    </div>
  )
}

// 광장에 모인 정지 장면 — 뒤(작게·흐리게) 하객들 + 앞 중앙 신랑·신부.
const GUESTS: { head: string; body: string; className: string }[] = [
  { head: 'chu_sport', body: 'casual', className: 'left-[4%] w-[13%] opacity-80' },
  { head: 'yh_bob', body: 'casual', className: 'left-[20%] bottom-[14%] w-[11%] opacity-70' },
  { head: 'chu_buzz', body: 'party', className: 'left-[68%] bottom-[12%] w-[11%] opacity-70' },
  { head: 'yh_pigtail', body: 'casual', className: 'left-[84%] w-[13%] opacity-80' },
]

export function MoiGatherPreviewCard({ onEnter }: { onEnter: () => void }) {
  const t = useT()
  return (
    <section className="mx-4 mt-4">
      <button
        type="button"
        onClick={onEnter}
        aria-label={t('loungeV2.gather.enter')}
        className="block w-full overflow-hidden rounded-2xl border border-lng-line bg-white text-left shadow-[0_2px_10px_rgba(30,58,95,0.06)]"
      >
        {/* 정적 스냅샷 — 흰 바닥(광장) + 따뜻한 조명 + 모인 모이들 */}
        <div className="relative h-40 w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,#fff4dd,transparent_62%),linear-gradient(180deg,#fbf8f1,#f1ece1)]">
          {GUESTS.map((g, i) => (
            <MoiFigure key={i} head={g.head} body={g.body} className={g.className} />
          ))}
          {/* 신랑·신부 — 앞 중앙, 크게 */}
          <MoiFigure head="chu_default" body="suit" className="left-[36%] w-[16%]" />
          <MoiFigure head="yh_veil" body="bride_bouquet" className="left-[50%] w-[16%]" />

          {/* 우측하단 ⛶ (유튜브식 전체화면) */}
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-white backdrop-blur">
            <Maximize className="h-4 w-4" />
          </span>
        </div>
        <div className="px-4 py-3">
          <div className="text-[15px] font-extrabold text-lng-navy">{t('loungeV2.gather.title')}</div>
        </div>
      </button>
    </section>
  )
}
