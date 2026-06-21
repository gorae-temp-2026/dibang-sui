// 디방인연 스와이프 카드 — 익명 단계(이음 전). 목업 .swcard 이식.
// 사진 갤러리(좌우 탭) + 대표포함 2장 무료/3장째 요네 게이트 + 티어/접속/hook/공통친구/익명 신뢰막대.
// 이름은 미노출(이음 후 공개). 액션(넘기기/이음)·"프로필 보기 ▾"는 맨 위 카드에서만.
import { ChevronDown, Lock, Share2, Users, X } from 'lucide-react'
import type { Moi, Tier } from './types'
import { FREE_PHOTOS, PHOTO_COST, TIER_META } from './data'
import { cn } from '../../lib/utils'

const TIER_BADGE: Record<Tier, string> = {
  0: 'bg-[#3FAE6E]/90 text-white',
  1: 'bg-[#E8A865]/95 text-[#3a2606]',
  2: 'bg-[#E0607A]/95 text-white',
}

function photoBg(hue: number) {
  return `linear-gradient(150deg, hsl(${hue} 52% 34%), hsl(${(hue + 36) % 360} 48% 16%))`
}

interface InyeonCardProps {
  moi: Moi
  photoIdx: number
  unlocked: boolean
  isTop: boolean
  depth: number // 0 = top, 1/2 = behind
  onPhotoNav: (dir: 1 | -1) => void
  onUnlock: () => void
  onIeum: () => void
  onPass: () => void
  onOpenDetail: () => void
}

export function InyeonCard({
  moi,
  photoIdx,
  unlocked,
  isTop,
  depth,
  onPhotoNav,
  onUnlock,
  onIeum,
  onPass,
  onOpenDetail,
}: InyeonCardProps) {
  const locked = photoIdx >= FREE_PHOTOS && !unlocked
  const photo = moi.photos[photoIdx] ?? moi.photos[0]
  const tier = TIER_META[moi.tier]

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden rounded-3xl bg-[#222] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none',
        depth === 1 && 'scale-[0.94] translate-y-4',
        depth === 2 && 'scale-[0.88] translate-y-8 opacity-60',
      )}
    >
      {/* 사진 레이어 (실제 url 없으면 hue 그라데이션) */}
      <div
        className={cn('absolute inset-0 bg-cover bg-[center_18%] transition', locked && 'blur-xl')}
        style={photo?.url ? { backgroundImage: `url(${photo.url})` } : { background: photoBg(photo?.hue ?? 210) }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-[#0d1621]/90 via-[#0d1621]/55 to-transparent" />

      {/* 사진 세그먼트 점 */}
      <div className="absolute inset-x-3 top-2.5 z-[4] flex gap-1.5">
        {moi.photos.map((_, i) => (
          <span key={i} className={cn('h-[3.5px] flex-1 rounded-full', i === photoIdx ? 'bg-white' : 'bg-white/30')} />
        ))}
      </div>

      {/* 좌우 탭존 (맨 위 카드만) */}
      {isTop && (
        <>
          <button
            type="button"
            aria-label="이전 사진"
            className="absolute bottom-[34%] left-0 top-0 z-[3] w-[42%] cursor-pointer"
            onClick={() => onPhotoNav(-1)}
          />
          <button
            type="button"
            aria-label="다음 사진"
            className="absolute bottom-[34%] right-0 top-0 z-[3] w-[42%] cursor-pointer"
            onClick={() => onPhotoNav(1)}
          />
        </>
      )}

      {/* 접속/티어 배지 */}
      {moi.online && (
        <div className="absolute left-3.5 top-5 z-[4] flex items-center gap-1.5 rounded-full bg-[#0d1621]/45 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#46d77f] shadow-[0_0_0_3px_rgba(70,215,127,0.25)]" />
          접속 중
        </div>
      )}
      <div className={cn('absolute right-3.5 top-5 z-[4] rounded-full px-2.5 py-1.5 text-[10px] font-extrabold backdrop-blur', TIER_BADGE[moi.tier])}>
        {tier.label}
      </div>

      {/* 잠금 오버레이 (3장째부터) */}
      {locked && isTop && (
        <button
          type="button"
          onClick={onUnlock}
          className="absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-white/25 bg-[#0d1621]/55 px-5 py-4 text-white backdrop-blur"
        >
          <Lock className="h-5 w-5" />
          <span className="text-sm font-bold">사진 더보기</span>
          <span className="text-xs font-extrabold text-[#F8C57A]">🪙 {PHOTO_COST}</span>
        </button>
      )}

      {/* 하단 정보 (익명) */}
      <div className="absolute inset-x-0 bottom-0 z-[4] p-5 pb-7 text-white">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <span className="text-lg">{moi.prov[0]?.emoji}</span>
          {moi.hook}
        </div>
        {moi.mutualCount > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
            <Users className="h-3 w-3" /> 공통 친구 {moi.mutualCount}명
          </div>
        )}
        {/* 익명 신뢰범위 막대 */}
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-[#0d1621]/40 px-3 py-2 backdrop-blur">
          <span className="text-[11px] font-medium text-white/90">신뢰</span>
          <span className="flex items-center gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={cn('h-3.5 w-[7px] rounded-sm', i < moi.barsF ? 'bg-[#F8C57A]' : 'bg-white/25')} />
            ))}
          </span>
          <span className="ml-auto text-[11px] font-extrabold text-[#F8C57A]">{moi.balLabel}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-white/75">
          <Lock className="h-3 w-3" /> 이음하면 이름이 공개돼요
        </div>
      </div>

      {/* 액션 (맨 위 카드만) */}
      {isTop && (
        <>
          <div className="absolute inset-x-0 bottom-11 z-[6] flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="넘기기"
              onClick={onPass}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/35 bg-[#141e2d]/50 text-white shadow-lg backdrop-blur transition active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="이음 신청"
              onClick={onIeum}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white shadow-lg transition active:scale-90"
            >
              <Share2 className="h-[22px] w-[22px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenDetail}
            className="absolute bottom-0 left-1/2 z-[6] flex -translate-x-1/2 items-center gap-1 rounded-t-2xl border border-b-0 border-white/20 bg-[#0d1621]/60 px-5 py-2 text-[11px] font-bold text-white backdrop-blur"
          >
            프로필 보기 <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
