import bgUrl from '../assets/mobile-invitation-lounge.png';
import { useT } from '../lib/i18n';

interface LoungePreviewProps {
  loungeId: string;
  /**
   * Dibang Wedding(본체) 사이트 URL. packages는 환경 비의존이어야 하므로
   * 호출 앱이 env에서 읽어 주입한다. (UI/데이터 분리 1-C)
   *
   * onEnter가 제공되면 dibangOrigin은 표시·로깅 용도로만 받고 nav는 콜백 책임.
   */
  dibangOrigin: string;
  /**
   * 입장 버튼 콜백. 호출 앱이 window.location.href 책임. 미제공 시 fallback으로
   * dibangOrigin 기반 nav (이전 동작 보존). (UI/데이터 분리 라운드 3 A1-3)
   */
  onEnter?: (loungeId: string) => void;
}

// 라운지 탭: 배경 이미지 풀블리드 + '입장하기' 버튼만.
export function LoungePreview({ loungeId, dibangOrigin, onEnter }: LoungePreviewProps) {
  const t = useT();
  const handleEnterLounge = () => {
    if (onEnter) {
      onEnter(loungeId);
      return;
    }
    // fallback: 콜백 미제공 시 직접 nav (이전 호출자 호환)
    window.location.href = `${dibangOrigin}/lounge/${loungeId}/enter`;
  };

  return (
    <div className="relative w-full">
      {/* 컨테이너 max-width(청첩장 420px 프레임)를 꽉 채움 — 자연 비율로 전체 노출 */}
      <img src={bgUrl} alt={t('invitationUi.lounge.previewAlt')} className="block w-full" />
      <button
        className="absolute bottom-[56px] left-1/2 -translate-x-1/2 bg-navy text-white border-none py-3.5 px-9 rounded-3xl font-body text-sm font-semibold tracking-[.04em] cursor-pointer"
        onClick={handleEnterLounge}
      >
        {t('invitationUi.lounge.enter')}
      </button>
    </div>
  );
}
