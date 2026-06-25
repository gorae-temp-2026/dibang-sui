// 익명 신뢰범위 — 정확값 없이 거친 티어/막대만(핸드오프 §13-1·정보공개테이블 "신뢰=익명 범위").
// "누군지 몰라도 신용을 안다" 프라이버시 보존 — 정확 Moi Credit은 온체인(프로필 밖).
import type { ProfileData } from './types'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

const TIERS = ['B', 'BB', 'BBB', 'A', 'AA', 'AAA']

export function TrustRange({ trust }: { trust: ProfileData['trustRange'] }) {
  const t = useT()
  const idx = TIERS.indexOf(trust.tier)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white/70">
        <span>{t('profile.trustRange.title')}</span>
        <span className="text-[#F8C57A]">{trust.label}</span>
      </div>
      <div className="flex gap-1">
        {TIERS.map((t, i) => (
          <div
            key={t}
            className={cn('h-2.5 flex-1 rounded-sm', i <= idx ? 'bg-[#F8C57A]' : 'bg-white/15')}
            title={t}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
        {t('profile.trustRange.desc')}
      </p>
    </div>
  )
}
