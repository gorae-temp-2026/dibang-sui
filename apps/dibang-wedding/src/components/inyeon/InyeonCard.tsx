// 디방인연 스와이프 카드 — 익명 단계(이음 전). 목업 .swcard 이식.
// 사진 갤러리(좌우 탭) + 대표포함 2장 무료/3장째 요네 게이트 + 티어/접속/hook/공통친구/익명 신뢰막대.
// 이름은 미노출(이음 후 공개). 카드(사진) 탭 → 바로 프로필(풀페이지). 액션(넘기기/이음)은 맨 위 카드만.
import { Lock, Share2, Users, X } from 'lucide-react'
import type { Moi } from './types'
import { FREE_PHOTOS, PHOTO_COST } from './data'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/utils'

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
  onOpenProfile: () => void
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
  onOpenProfile,
}: InyeonCardProps) {
  const t = useT()
  const locked = photoIdx >= FREE_PHOTOS && !unlocked
  const photo = moi.photos[photoIdx] ?? moi.photos[0]

  return (
    <div
      onClick={isTop ? onOpenProfile : undefined}
      className={cn(
        'absolute inset-0 overflow-hidden rounded-3xl bg-[#222] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none',
        isTop && 'cursor-pointer',
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
            onClick={(e) => { e.stopPropagation(); onPhotoNav(-1) }}
          />
          <button
            type="button"
            aria-label="다음 사진"
            className="absolute bottom-[34%] right-0 top-0 z-[3] w-[42%] cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onPhotoNav(1) }}
          />
        </>
      )}

      {/* 접속/티어 배지 */}
      {moi.online && (
        <div className="absolute left-3.5 top-5 z-[4] flex items-center gap-1.5 rounded-full bg-[#0d1621]/45 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#46d77f] shadow-[0_0_0_3px_rgba(70,215,127,0.25)]" />
          {t('inyeon.online')}
        </div>
      )}
      {/* 우상단 = 정성 연결 표기(데이팅앱 느낌, 관계거리 라벨 대신). */}
      <div className="absolute right-3.5 top-5 z-[4] flex items-center gap-1 rounded-full bg-[#0d1621]/45 px-2.5 py-1.5 text-[10.5px] font-bold text-white backdrop-blur">
        {moi.mutualCount > 0 ? (
          <>
            <Users className="h-3 w-3" /> {t('inyeon.hasMutual')}
          </>
        ) : (
          t('inyeon.newConnection')
        )}
      </div>

      {/* 잠금 오버레이 (3장째부터) */}
      {locked && isTop && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnlock() }}
          className="absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-white/25 bg-[#0d1621]/55 px-5 py-4 text-white backdrop-blur"
        >
          <Lock className="h-5 w-5" />
          <span className="text-sm font-bold">{t('inyeon.morePhotos')}</span>
          <span className="text-xs font-extrabold text-[#F8C57A]">🪙 {PHOTO_COST}</span>
        </button>
      )}

      {/* 하단 정보 (익명) */}
      <div className="absolute inset-x-0 bottom-0 z-[4] p-5 pb-7 text-white">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <span className="text-lg">{moi.prov[0]?.emoji}</span>
          {t(`inyeon.tier.${moi.tier}.hook`)}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-white/75">
          <Lock className="h-3 w-3" /> {t('inyeon.revealName')}
        </div>
      </div>

      {/* 액션 (맨 위 카드만) */}
      {isTop && (
        <>
          <div className="absolute inset-x-0 bottom-11 z-[6] flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label={t('inyeon.pass')}
              onClick={(e) => { e.stopPropagation(); onPass() }}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/35 bg-[#141e2d]/50 text-white shadow-lg backdrop-blur transition active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={t('inyeon.ieum')}
              onClick={(e) => { e.stopPropagation(); onIeum() }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white shadow-lg transition active:scale-90"
            >
              <Share2 className="h-[22px] w-[22px]" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
