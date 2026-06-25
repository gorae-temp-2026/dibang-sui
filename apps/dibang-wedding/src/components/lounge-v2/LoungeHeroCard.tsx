import { WarmthOrb } from './WarmthOrb';
import { useT } from '../../lib/i18n';

// Lounge 카드 — 프로토타입 .hero/.hero-eyebrow/.hero-title/.hero-hosts/.warmth-chip 정합.
// 정체성(eyebrow / 라운지명 / 호스트 4명) + 우상단 온기 orb(라벨 없음) + 우측하단 사진 공유 버튼(선택).

interface LoungeHeroCardProps {
  groomName: string;
  brideName: string;
  groomFatherName?: string;
  groomMotherName?: string;
  brideFatherName?: string;
  brideMotherName?: string;
  warmthLabel: string;
  /** 사진 공유 버튼 클릭 콜백 — 전달 시에만 카드 우측하단에 버튼 노출. 내비게이션 책임은 호출부. */
  onSharePhoto?: () => void;
}

export function LoungeHeroCard({
  groomName,
  brideName,
  groomFatherName,
  groomMotherName,
  brideFatherName,
  brideMotherName,
  warmthLabel,
  onSharePhoto,
}: LoungeHeroCardProps) {
  const t = useT();
  const hasGroomParents = groomFatherName || groomMotherName;
  const hasBrideParents = brideFatherName || brideMotherName;

  return (
    <section className="relative mx-4 mt-16 mb-[18px] rounded-[18px] border border-lng-line bg-white px-5 py-[18px] shadow-[0_6px_22px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
      <span className="absolute right-[14px] top-[14px] z-[5]">
        <WarmthOrb label={warmthLabel} variant="hero" />
      </span>

      <span className="text-[14px] font-medium uppercase tracking-[0.18em] text-lng-sky">
        Wedding Lounge
      </span>
      <h1 className="m-0 mt-[6px] pr-12 text-[22px] font-bold leading-[1.3] tracking-[-0.02em] text-lng-navy/70">
        {t('loungeV2.hero.title', { groom: groomName, bride: brideName })}
      </h1>

      {(hasGroomParents || hasBrideParents || onSharePhoto) && (
        <div className="mt-2 flex items-end justify-between gap-3">
          {hasGroomParents || hasBrideParents ? (
            <p className="mb-0 text-[14px] leading-[1.7] text-lng-muted">
              {hasGroomParents && (
                <span className="block">
                  <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.groomSide')} </span>
                  {groomFatherName && (
                    <>
                      <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.father')} </span>
                      <span className="font-medium text-lng-text-primary">{groomFatherName}</span>
                    </>
                  )}
                  {groomFatherName && groomMotherName && <span className="mx-[6px] text-lng-line">·</span>}
                  {groomMotherName && (
                    <>
                      <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.mother')} </span>
                      <span className="font-medium text-lng-text-primary">{groomMotherName}</span>
                    </>
                  )}
                </span>
              )}
              {hasBrideParents && (
                <span className="block">
                  <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.brideSide')} </span>
                  {brideFatherName && (
                    <>
                      <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.father')} </span>
                      <span className="font-medium text-lng-text-primary">{brideFatherName}</span>
                    </>
                  )}
                  {brideFatherName && brideMotherName && <span className="mx-[6px] text-lng-line">·</span>}
                  {brideMotherName && (
                    <>
                      <span className="font-medium text-[#9CA3AF]">{t('loungeV2.hero.mother')} </span>
                      <span className="font-medium text-lng-text-primary">{brideMotherName}</span>
                    </>
                  )}
                </span>
              )}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}

          {onSharePhoto && (
            <button
              type="button"
              onClick={onSharePhoto}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-lng-line bg-white px-3.5 py-2.5 text-sm font-medium text-lng-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              {t('loungeV2.hero.sharePhoto')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
