// 모이가 모인곳 — 풀스크린 2.5D 미니룸. 라운지에서 미리보기 카드로 진입(핸드오프 §3·§12-2).
// ⚠️ 현재 스텁(④): 정적 장면 자리표시 + TODO. 본구현(배경+캐릭터 분리·히트테스트·팬/줌)은
//    렌더 라이브러리(react-konva vs PixiJS) 박태원 합동확정 + tech-stack-map 등재 후.
// 샵(모이 꾸미기)은 이 화면 안에서 진입(§5) — 현재 스텁.
import { useNavigate } from 'react-router'
import { ArrowLeft, ShoppingBag } from 'lucide-react'

export function MoiGatherPage() {
  const navigate = useNavigate()

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-[#0A1626] text-[#E8EFF6]">
      <header className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-extrabold text-white">모이가 모인곳</div>
          <div className="truncate text-[11px] text-white/55">웨딩 라운지 · host 6명</div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-white"
          onClick={() => {
            /* TODO(④): 샵(모이 꾸미기) — v2.0 shop 탭 포팅 + 요네 충전. 미니룸 내부 진입. */
          }}
        >
          <ShoppingBag className="h-4 w-4" /> 샵·꾸미기
        </button>
      </header>

      {/* 정적 장면 자리표시 — 실제는 분리 소스 + 렌더 라이브러리 합성 */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(135,206,235,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(248,197,122,0.12),transparent_45%),linear-gradient(180deg,#0A1626,#0C1A2E)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(transparent,rgba(135,206,235,0.10))]" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="text-5xl">🏛️✨</div>
          <div className="text-lg font-extrabold text-white">2.5D 미니룸 (준비 중)</div>
          <p className="max-w-xs text-[12.5px] leading-relaxed text-white/55">
            결혼식·하객·신뢰 네트워크를 모이(캐릭터)로 시각화합니다. 캐릭터를 누르면 프로필(인연과 동일)이 열려요.
          </p>
          <span className="mt-1 rounded-full border border-white/12 px-3 py-1 text-[10px] font-bold text-white/40">
            TODO(④): react-konva/PixiJS 합동확정 후 본구현 · 프로필=⑤ 공유 컴포넌트
          </span>
        </div>
      </div>
    </div>
  )
}
