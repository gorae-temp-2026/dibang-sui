import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { useT } from '../lib/i18n';

export type MapProvider = 'naver' | 'kakao';

interface LocationProps {
  venueName: string;
  venueAddress: string;
  venueHall?: string;
  /**
   * 지도 앱 열기 콜백 (네이버/카카오). 호출 앱이 deep link URL 빌드·window.location 책임.
   * 미제공 시 무동작. (UI/데이터 분리 라운드 3 A1-2)
   */
  onOpenMap?: (provider: MapProvider, address: string) => void;
  /**
   * 주소 복사 콜백. 호출 앱이 clipboard 책임.
   */
  onCopyAddress?: (address: string) => void;
}

export function Location({ venueName, venueAddress, venueHall, onOpenMap, onCopyAddress }: LocationProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const t = useT();
  const hasAddress = venueAddress.trim() !== '';

  // 라운드 3 A1-2: 외부 nav·clipboard는 page 콜백 위임. dev 측의 빈 주소 disabled UX 흡수.

  return (
    <section
      ref={ref}
      className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">Location</div>
      <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">{t('invitationUi.location.title')}</div>
      <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
      <div className="font-serif font-medium text-lg text-ink text-center">{venueName}</div>
      {venueHall && <div className="text-sm text-muted text-center mt-1">{venueHall}</div>}
      <div className="text-sm text-muted text-center mt-1.5 mb-[18px] tracking-[.02em] leading-relaxed">{venueAddress}</div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onOpenMap?.('naver', venueAddress)}
          disabled={!hasAddress}
          className="bg-white border-2 border-[#03C75A] text-navy px-2 py-[11px] rounded-xl text-[11px] font-semibold tracking-[.02em] cursor-pointer font-body flex items-center justify-center transition-all duration-250 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {t('invitationUi.location.naverMap')}
        </button>
        <button
          onClick={() => onOpenMap?.('kakao', venueAddress)}
          disabled={!hasAddress}
          className="bg-white border-2 border-[#FEE500] text-navy px-2 py-[11px] rounded-xl text-[11px] font-semibold tracking-[.02em] cursor-pointer font-body flex items-center justify-center transition-all duration-250 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {t('invitationUi.location.kakaoMap')}
        </button>
        <button
          onClick={() => onCopyAddress?.(venueAddress)}
          disabled={!hasAddress}
          className="bg-white border border-line text-navy px-2 py-[11px] rounded-xl text-[11px] font-semibold tracking-[.02em] cursor-pointer font-body flex items-center justify-center transition-all duration-250 hover:bg-pale-sky hover:border-soft-sky hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:border-line"
        >
          {t('invitationUi.location.copyAddress')}
        </button>
      </div>
    </section>
  );
}
