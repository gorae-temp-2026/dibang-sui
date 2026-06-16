import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getMyWeddingsOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import type { WeddingSummary } from '@gorae/contracts';
import { useCopyToClipboard } from '@gorae/web-utils';
import { WeddingCard } from '../components/my-wedding/WeddingCard';
import { AddCard } from '../components/my-wedding/AddCard';
import { getGuestWebOrigin } from '../lib/external-urls';

export function MyWeddingPage() {
  const navigate = useNavigate();
  const { data: weddings, isLoading } = useQuery({
    ...getMyWeddingsOptions(),
    retry: false,
  });
  const [copyToast, setCopyToast] = useState(false);
  const { copy } = useCopyToClipboard();

  const showCopyToast = useCallback(() => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  }, []);

  const weddingList = Array.isArray(weddings) ? weddings : [];
  const guestWebOrigin = getGuestWebOrigin();
  // window.location.origin은 SPA mount 후 호출이라 브라우저 보장. SSR 가드만 추가.
  // (UI/데이터 분리 라운드 3 A2: HostSlotSectionContainer에 prop으로 흘려보냄)
  const inviteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // 호스트 초대 link share — WeddingCard → HostSlotSectionContainer에 forward.
  const handleShareInvite = useCallback(async (url: string) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: '결혼식 초대', url });
        return;
      } catch { /* 사용자 취소 */ }
    }
    const ok = await copy(url);
    if (ok) showCopyToast();
  }, [copy, showCopyToast]);

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
        const title = `${wedding.groom_name} & ${wedding.bride_name} 결혼식에 초대합니다`;
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
    [guestWebOrigin, copy, showCopyToast],
  );

  return (
    <div className="py-8">
      <div className="px-6 mb-6">
        <h1 className="text-[28px] font-semibold text-navy">나의 결혼식</h1>
      </div>

      {isLoading && (
        <p className="text-base text-muted text-center py-8">불러오는 중...</p>
      )}

      {!isLoading && (
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
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {copyToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div className="rounded-xl bg-gray-900/90 px-5 py-3 text-sm text-white shadow-lg">
            링크가 복사되었습니다
          </div>
        </div>
      )}
    </div>
  );
}
