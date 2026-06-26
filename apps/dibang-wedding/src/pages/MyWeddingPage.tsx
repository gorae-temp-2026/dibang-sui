import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { myWeddingMachine } from '../machines/myWedding.machine';
import { useQuery } from '@tanstack/react-query';
import { getMyWeddingsOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import type { WeddingSummary } from '../types/db-compat';
import { useCopyToClipboard } from '@gorae/web-utils';
import { WeddingCard } from '../components/my-wedding/WeddingCard';
import { AddCard } from '../components/my-wedding/AddCard';
import { AddHostSection } from '../components/my-wedding/AddHostSection';
import { WithdrawSection } from '../components/my-wedding/WithdrawSection';
import { DefiTeaserCard } from '../components/my-wedding/DefiTeaserCard';
import { getGuestWebOrigin } from '../lib/external-urls';
import { useT } from '../lib/i18n';
import { isDevBypass } from '../dev/devBypass';

export function MyWeddingPage() {
  const navigate = useNavigate();
  const t = useT();
  const { data: weddings, isLoading } = useQuery({
    ...getMyWeddingsOptions(),
    retry: false,
  });
  // 페이지 flow는 머신(myWedding): data(로딩 표시)·toast(복사 알림 자동닫힘).
  const [state, send] = useMachine(myWeddingMachine);
  const copyToast = state.matches({ toast: 'visible' });
  const { copy } = useCopyToClipboard();

  // 목록 로딩 완료 → 머신 data축 동기.
  useEffect(() => {
    if (!isLoading) send({ type: 'LOAD_DONE' });
  }, [isLoading, send]);

  // 복사 성공 → 머신 toast축(2초 자동닫힘은 머신 after 타이머).
  const showCopyToast = useCallback(() => {
    send({ type: 'COPY_DONE' });
  }, [send]);

  const weddingList = Array.isArray(weddings) ? weddings : [];
  // DeFi 티저 카드용(데모 영상 전용) — isDevBypass(dev 프리뷰)에서만 렌더.
  const upcomingWedding = weddingList.find((w) => w.status === 'active');
  const guestWebOrigin = getGuestWebOrigin();
  // window.location.origin은 SPA mount 후 호출이라 브라우저 보장. SSR 가드만 추가.
  // (UI/데이터 분리 라운드 3 A2: HostSlotSectionContainer에 prop으로 흘려보냄)
  const inviteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // 호스트 초대 link share — WeddingCard → HostSlotSectionContainer에 forward.
  const handleShareInvite = useCallback(async (url: string) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: t('page.myWedding.inviteShareTitle'), url });
        return;
      } catch { /* 사용자 취소 */ }
    }
    const ok = await copy(url);
    if (ok) showCopyToast();
  }, [copy, showCopyToast, t]);

  // 청첩장 share/copy/preview 핸들러 — wedding 단위 closure로 캡처.
  // (UI/데이터 분리 P2-1: WeddingCard에서 외부 API 호출 책임을 page가 흡수)
  const makeHandlers = useCallback(
    (wedding: WeddingSummary) => ({
      onCopyInvitationLink: async (slug: string) => {
        const url = `${guestWebOrigin}/${slug}`;
        const ok = await copy(url);
        if (ok) showCopyToast();
      },
      onShareInvitation: async (slug: string) => {
        const url = `${guestWebOrigin}/${slug}`;
        const title = t('page.myWedding.invitationShareTitle', { groom: wedding.groom_name, bride: wedding.bride_name });
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          try {
            await navigator.share({ title, url });
          } catch { /* 사용자가 취소 */ }
        } else {
          const ok = await copy(url);
          if (ok) showCopyToast();
        }
      },
      onOpenInvitationPreview: (slug: string) => {
        window.open(`${guestWebOrigin}/${slug}`, '_blank');
      },
      guestFlowUrl: `${guestWebOrigin}/?weddingId=${wedding.id}`,
    }),
    [guestWebOrigin, copy, showCopyToast, t],
  );

  return (
    <div className="py-8">
      <div className="px-6 mb-6">
        <h1 className="text-[28px] font-semibold text-navy">{t('nav.myEvent')}</h1>
      </div>

      {state.matches({ data: 'loading' }) && (
        <p className="text-base text-muted text-center py-8">{t('events.loading')}</p>
      )}

      {state.matches({ data: 'loaded' }) && (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-4">
          {weddingList.length === 0 ? (
            <div className="shrink-0 w-[calc(100vw-2rem)] max-w-lg snap-center mx-auto">
              <AddCard onClick={() => navigate('/invitation/create')} />
            </div>
          ) : (
            <>
              {weddingList.map((wedding) => {
                const handlers = makeHandlers(wedding);
                return (
                  <div key={wedding.id} className="shrink-0 w-[calc(100vw-2rem)] max-w-lg snap-center">
                    <WeddingCard
                      wedding={wedding}
                      onCopyLink={showCopyToast}
                      onCopyInvitationLink={handlers.onCopyInvitationLink}
                      onShareInvitation={handlers.onShareInvitation}
                      onOpenInvitationPreview={handlers.onOpenInvitationPreview}
                      guestFlowUrl={handlers.guestFlowUrl}
                      inviteOrigin={inviteOrigin}
                      onShareInvite={handleShareInvite}
                    />
                    <AddHostSection weddingId={wedding.id} />
                    <WithdrawSection weddingId={wedding.id} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* '우리 결혼식, 누가 올까' — MOI CREDIT·하객 예측(예상 하객·축의금·Moi Credit·무담보 웨딩 대출 Sui 티저).
          데모 영상 전용 = isDevBypass(dev 프리뷰)에서만 노출, prod UI엔 안 보임(T14). */}
      {isDevBypass() && upcomingWedding && (
        <DefiTeaserCard groomName={upcomingWedding.groom_name} brideName={upcomingWedding.bride_name} />
      )}

      {copyToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div className="rounded-xl bg-gray-900/90 px-5 py-3 text-sm text-white shadow-lg">
            {t('page.myWedding.linkCopied')}
          </div>
        </div>
      )}
    </div>
  );
}
