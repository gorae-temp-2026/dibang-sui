import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { useT } from '../lib/i18n';

function KakaoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3C1E1E" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.36l4.22-2.8c.5.06 1.02.1 1.56.1 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

interface ShareProps {
  /**
   * 카카오톡 공유 트리거. 호출 앱이 SDK·외부 API 책임. 미제공 시 무동작.
   * (UI/데이터 분리 라운드 3 A1-4)
   */
  onShareKakao?: () => void;
  /**
   * 현재 청첩장 URL 복사 트리거. 호출 앱이 URL 조립(window.location.href 등)·clipboard 책임.
   * 미제공 시 무동작.
   */
  onCopyCurrentUrl?: () => void;
}

export function Share({ onShareKakao, onCopyCurrentUrl }: ShareProps = {}) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const t = useT();

  return (
    <section
      ref={ref}
      className="px-7 pt-8 pb-3 opacity-0 translate-y-8 transition-all duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="flex flex-nowrap justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-[54px] h-[54px] rounded-full border-none cursor-pointer flex items-center justify-center font-body bg-[#FEE500] text-[#3C1E1E] transition-all duration-250 ease-[cubic-bezier(.16,1,.3,1)] hover:scale-108 hover:-rotate-[4deg] hover:shadow-[0_8px_20px_rgba(254,229,0,.35)]"
            title={t('invitationUi.share.kakaoTitle')}
            onClick={() => onShareKakao?.()}
          >
            <KakaoIcon />
          </button>
          <span className="text-sm text-muted font-medium tracking-[.04em]">{t('invitationUi.share.kakaoLabel')}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-[54px] h-[54px] rounded-full border-none cursor-pointer flex items-center justify-center font-body bg-pale-sky text-navy transition-all duration-250 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-soft-sky hover:scale-108"
            title={t('invitationUi.share.linkTitle')}
            onClick={() => onCopyCurrentUrl?.()}
          >
            <LinkIcon />
          </button>
          <span className="text-sm text-muted font-medium tracking-[.04em]">{t('invitationUi.share.linkLabel')}</span>
        </div>
      </div>
    </section>
  );
}
