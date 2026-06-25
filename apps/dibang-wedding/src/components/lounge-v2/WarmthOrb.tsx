// 우리의 온기 orb — 흰 원 + 자전 분홍 dot(::before, .lng-orb) + 온도° 텍스트.
// 프로토타입 .warm-orb / .warm-orb-text 정합. hero=38px(라벨 없음), mini=28px + '우리의 온기'.

import { useT } from '../../lib/i18n';

interface WarmthOrbProps {
  /** "36.5°" 형태 */
  label: string;
  variant: 'hero' | 'mini';
}

export function WarmthOrb({ label, variant }: WarmthOrbProps) {
  const t = useT();
  if (variant === 'hero') {
    return (
      <span className="lng-orb inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center align-middle">
        <span className="relative z-[1] text-[14px] font-semibold leading-none tracking-[-0.02em] text-lng-brand-dark">
          {label}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-[6px]">
      <span className="lng-orb inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center">
        <span className="relative z-[1] text-[14px] font-semibold leading-none tracking-[-0.02em] text-lng-brand-dark">
          {label}
        </span>
      </span>
      <span className="whitespace-nowrap text-[14px] font-medium leading-none tracking-[-0.01em] text-lng-ink">
        {t('loungeV2.warmth.label')}
      </span>
    </span>
  );
}
