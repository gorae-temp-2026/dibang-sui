import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { loungeFeedMachine } from '../machines/loungeFeed.machine';
import { useGetFeed } from '../queries/lounge-feed/useGetFeed';
import { useGetLounge } from '../queries/lounge-feed/useGetLounge';
import { useGetWedding } from '../queries/lounge-feed/useGetWedding';
import { useGetAnnouncements } from '../queries/lounge-feed/useGetAnnouncements';
import { useCreateAnnouncement } from '../queries/lounge-feed/useCreateAnnouncement';
import { useDeleteAnnouncement } from '../queries/lounge-feed/useDeleteAnnouncement';
import { FeedItemGuestbookEntry } from '../components/lounge-feed/FeedItemGuestbookEntry';
import { FeedItemLoungeCheckIn } from '../components/lounge-feed/FeedItemLoungeCheckIn';
import { FeedItemAnnouncementContainer } from '../components/lounge-feed/FeedItemAnnouncementContainer';
import { FeedItemGuestbookMessage } from '../components/lounge-feed/FeedItemGuestbookMessage';
import { AnnouncementForm } from '../components/lounge-feed/AnnouncementForm';
import { ParticipantListModal } from '../components/lounge-feed/ParticipantListModal';
import { PinnedAnnouncementBanner } from '../components/lounge-feed/PinnedAnnouncementBanner';
import { colors, fonts } from '../lib/theme';
import type { FeedItem } from '../types/db-compat';
import { useOnchainLoungeFeed } from '../hooks/useOnchainLoungeFeed';
import { useGetMe } from '../queries/shared/useGetMe';
import { useT, useLang } from '../lib/i18n';

const MAX_VISIBLE_AVATARS = 5;

function formatDate(dateStr: string, lang: 'ko' | 'en'): string {
  try {
    const d = new Date(dateStr);
    if (lang === 'en') {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}년 ${month}월 ${day}일`;
  } catch {
    return dateStr;
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function LoungeSkeleton() {
  return (
    <div style={{ flex: 1, backgroundColor: colors.surfaceWarm, minHeight: '100vh' }}>
      <div
        style={{
          paddingTop: 16,
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 20,
          backgroundColor: colors.textPrimary,
        }}
      >
        <div
          style={{
            height: 16,
            width: 64,
            borderRadius: 8,
            marginBottom: 12,
            backgroundColor: 'rgba(212,104,122,0.2)',
          }}
        />
        <div
          style={{
            height: 28,
            width: 192,
            borderRadius: 8,
            marginBottom: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
        <div
          style={{
            height: 12,
            width: 128,
            borderRadius: 6,
            backgroundColor: 'rgba(212,104,122,0.15)',
          }}
        />
      </div>
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 12,
          paddingBottom: 12,
          backgroundColor: colors.bgWarm,
          borderBottom: `1px solid ${colors.borderWarm}`,
        }}
      >
        <div
          style={{
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.surfaceWarm,
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 16, paddingRight: 16, paddingTop: 20 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 64,
              borderRadius: 16,
              backgroundColor: colors.surfaceWarm,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function LoungeFeedPage() {
  const { loungeId } = useParams<{ loungeId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const [state, send] = useMachine(loungeFeedMachine);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

  // DB 호출 비활성화 — 온체인 전환. Go API 없어도 동작.
  // useEnsureLoungeCheckIn(loungeId); // DB 체크인 비활성화
  const loungeQuery = useGetLounge(loungeId ?? '');
  const weddingId = loungeQuery.data?.wedding_id;
  const weddingQuery = useGetWedding(weddingId);
  // Host 여부 = 로그인 유저 id가 이 결혼식의 호스트 슬롯(신랑·신부·양가 혼주) 중 하나와 일치.
  // (LoungeV2Page와 동일 판정.) 공지 작성·관리 UI 노출 게이트.
  const myId = useGetMe().data?.id;
  const weddingHosts = weddingQuery.data?.hosts;
  const isHost = !!myId && !!weddingHosts && [
    weddingHosts.host_groom_id,
    weddingHosts.host_bride_id,
    weddingHosts.host_groom_father_id,
    weddingHosts.host_groom_mother_id,
    weddingHosts.host_bride_father_id,
    weddingHosts.host_bride_mother_id,
  ].includes(myId);
  const feedQuery = useGetFeed(loungeId ?? '');
  const observerRef = useRef<HTMLDivElement>(null);
  const announcementsQuery = useGetAnnouncements(loungeId ?? '');
  const createAnnouncement = useCreateAnnouncement(loungeId ?? '');
  const deleteAnnouncement = useDeleteAnnouncement(loungeId ?? '');
  const currentAnnouncement = announcementsQuery.data?.data[0];

  const handleSubmitAnnouncement = (msg: string) => {
    if (!loungeId) return;
    return new Promise<void>((resolve, reject) => {
      createAnnouncement.mutate(
        { path: { loungeId }, body: { message: msg } },
        {
          onSuccess: () => {
            setShowAnnouncementForm(false);
            resolve();
          },
          onError: (err) => reject(err),
        },
      );
    });
  };

  const handleDeleteAnnouncement = () => {
    if (!loungeId || !currentAnnouncement) return;
    deleteAnnouncement.mutate({ announcementId: currentAnnouncement.id, loungeId });
  };

  // pull-to-refresh 관련 state
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  // ---- xState와 TanStack Query 동기화 ----
  useEffect(() => {
    if ((feedQuery.isSuccess || feedQuery.isError) && state.matches('loading')) {
      send({ type: 'LOAD_SUCCESS' });
    }
  }, [feedQuery.isSuccess, feedQuery.isError, state, send]);

  // ---- 무한스크롤 ----
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
          feedQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // feedQuery 객체 전체는 매 렌더마다 새 참조 — 필요한 필드(hasNextPage·isFetchingNextPage·
    // fetchNextPage)만 deps에 명시. ESLint는 feedQuery 전체를 요구하지만 무한 재구독 위험.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage]);

  // ---- 풀다운 새로고침 ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80 && state.matches('idle')) {
      send({ type: 'REFRESH' });
      feedQuery.refetch().then(
        () => send({ type: 'REFRESH_SUCCESS' }),
        (err: unknown) => send({ type: 'REFRESH_ERROR', error: err instanceof Error ? err.message : 'Refresh failed' }),
      );
    }
    pullDistance.current = 0;
  }, [state, send, feedQuery]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0]?.clientY ?? 0;
    pullDistance.current = currentY - touchStartY.current;
  }, []);

  // ---- 온체인 피드 ----
  const onchainFeed = useOnchainLoungeFeed(weddingId);

  // ---- 피드 아이템 분리: DB + 온체인 합산 ----
  const dbItems: FeedItem[] = feedQuery.data?.pages.flatMap((page) => page.data) ?? [];
  // DB가 실패하면 온체인 피드로 폴백
  const onchainAsFeedItems: FeedItem[] = onchainFeed.feed
    .filter((oc) => oc.type === 'give' || oc.type === 'write' || oc.type === 'note')
    .map((oc) => ({
      type: 'guestbook_message' as const,
      id: oc.id,
      created_at: oc.ts ? new Date(oc.ts).toISOString() : new Date().toISOString(),
      data: {
        guest_name: `${oc.actor.slice(0, 6)}…${oc.actor.slice(-4)}`,
        message: oc.type === 'give' ? `💧 ${t('page.lounge.onchainGift', { amount: (oc.amount / 1e6).toFixed(3) })}`
          : oc.type === 'note' ? `💌 ${oc.message ?? t('page.lounge.note')}`
          : `✍️ ${t('page.lounge.onchainGuestbook')}`,
        recipient_slot: 'groom',
        relation_category: t('page.lounge.onchain'),
      },
    } as unknown as FeedItem));

  const allItems = dbItems.length > 0 ? dbItems : onchainAsFeedItems;
  const pinnedItems = allItems.filter((item) => item.type === 'host_announcement' && (item.data as Record<string, unknown>)?.is_pinned);
  const regularItems = allItems.filter((item) => !(item.type === 'host_announcement' && (item.data as Record<string, unknown>)?.is_pinned));

  // ---- 참여자 데이터 ----
  const loungeCheckInItems = allItems.filter((item) => item.type === 'lounge_check_in');
  const participantCount = onchainFeed.participantCount || loungeCheckInItems.length;
  const visibleAvatars = loungeCheckInItems.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = participantCount - MAX_VISIBLE_AVATARS;

  // ---- 웨딩 정보 ----
  const weddingInfo = weddingQuery.data?.info;

  // ---- 렌더 ----

  if (!loungeId) {
    return <div style={{ padding: 16, fontFamily: fonts.serif.family }}>{t('page.lounge.noLoungeId')}</div>;
  }

  // 로딩 중 스켈레톤
  if ((weddingQuery.isLoading || loungeQuery.isLoading) && !weddingInfo && onchainFeed.loading) {
    return <LoungeSkeleton />;
  }

  return (
    <div
      style={{ minHeight: '100vh', backgroundColor: colors.surfaceWarm, maxWidth: 480, margin: '0 auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Dark header ──────────────────────────────────────────────── */}
      <div
        style={{
          paddingTop: 12,
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 20,
          backgroundColor: colors.textPrimary,
        }}
      >
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate('/my-wedding')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {weddingInfo ? (
          <>
            {/* Date */}
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              {formatDate(weddingInfo.date, lang)}
            </p>

            {/* Names */}
            <h1
              style={{
                fontSize: 28,
                fontWeight: fonts.serifBold.weight,
                fontFamily: fonts.serifBold.family,
                marginTop: 4,
                marginBottom: 0,
                color: colors.white,
              }}
            >
              {t('page.lounge.weddingLoungeOf', { names: `${weddingInfo.groom_name} · ${weddingInfo.bride_name}` })}
            </h1>

            {/* Venue */}
            <p
              style={{
                fontSize: 16,
                marginTop: 2,
                marginBottom: 0,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {weddingInfo.venue.venue_name}
              {weddingInfo.venue.venue_hall ? ` ${weddingInfo.venue.venue_hall}` : ''}
            </p>

            {/* Parents */}
            {(weddingInfo.groom_father_name || weddingInfo.groom_mother_name || weddingInfo.bride_father_name || weddingInfo.bride_mother_name) && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {(weddingInfo.groom_father_name || weddingInfo.groom_mother_name) && (
                  <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                    {t('page.lounge.groomParents')} {weddingInfo.groom_father_name ?? ''} · {weddingInfo.groom_mother_name ?? ''}
                  </span>
                )}
                {(weddingInfo.bride_father_name || weddingInfo.bride_mother_name) && (
                  <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                    {t('page.lounge.brideParents')} {weddingInfo.bride_father_name ?? ''} · {weddingInfo.bride_mother_name ?? ''}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <h1
            style={{
              fontSize: 26,
              fontWeight: fonts.serifBold.weight,
              fontFamily: fonts.serifBold.family,
              marginTop: 4,
              marginBottom: 0,
              color: colors.white,
            }}
          >
            {t('page.lounge.weddingLounge')}
          </h1>
        )}

        {/* 하단 두 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {/* 좌: 참여자 버튼 */}
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              flex: 1,
              borderRadius: 16,
              padding: '12px 16px',
              backgroundColor: 'rgba(212,104,122,0.12)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              {t('page.lounge.participants')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              {/* 겹치는 원형 아바타 */}
              <div style={{ display: 'flex' }}>
                {visibleAvatars.map((item, i) => {
                  const name = (item.data as Record<string, unknown>)?.visitor_name as string | undefined;
                  return (
                    <div
                      key={item.id}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#6B7280',
                        border: `2px solid ${colors.textPrimary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 600,
                        color: colors.white,
                        marginLeft: i > 0 ? -10 : 0,
                        zIndex: MAX_VISIBLE_AVATARS - i,
                        position: 'relative',
                      }}
                    >
                      {name?.charAt(0) ?? '?'}
                    </div>
                  );
                })}
                {overflowCount > 0 && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: `2px solid ${colors.textPrimary}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.white,
                      marginLeft: -10,
                      position: 'relative',
                    }}
                  >
                    +{overflowCount}
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* 우: 공지 버튼 (Host 전용) */}
          {isHost && (
            <button
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              style={{
                borderRadius: 16,
                padding: '12px 16px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minWidth: 80,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{t('page.lounge.announcement')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 공지 작성 모달 ─────────────────────────────── */}
      {isHost && showAnnouncementForm && (
        <div
          onClick={() => setShowAnnouncementForm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              backgroundColor: colors.bgWarm,
              borderRadius: 20, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${colors.borderWarm}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{t('page.lounge.manageAnnouncement')}</h3>
              <button onClick={() => setShowAnnouncementForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: colors.textSecondary, cursor: 'pointer', padding: 0 }}>
                ✕
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <AnnouncementForm
                currentAnnouncement={currentAnnouncement}
                onSubmit={handleSubmitAnnouncement}
                onDelete={handleDeleteAnnouncement}
                isSubmitting={createAnnouncement.isPending}
                isDeleting={deleteAnnouncement.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 고정 공지 배너 (카카오톡 스타일) ────────────────────── */}
      {state.matches('idle') && pinnedItems.length > 0 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          {pinnedItems.map((item) => (
            <PinnedAnnouncementBanner key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* ── 피드 영역 ──────────────────────────────────────────────── */}
      <div style={{ padding: 16 }}>
        {/* 풀다운 새로고침 중 */}
        {state.matches('refreshing') && (
          <div style={{ textAlign: 'center', padding: '12px 0', color: colors.textMuted, fontSize: 14 }}>
            {t('page.lounge.refreshing')}
          </div>
        )}

        {/* 로딩 */}
        {state.matches('loading') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 96,
              paddingBottom: 96,
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: 24,
                height: 24,
                border: `2px solid ${colors.borderWarm}`,
                borderTopColor: colors.brand,
                borderRadius: '50%',
              }}
            />
          </div>
        )}

        {/* 에러 */}
        {state.matches('error') && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              backgroundColor: colors.bgWarm,
              borderRadius: 12,
              border: `1px solid ${colors.borderWarm}`,
            }}
          >
            <p style={{ fontSize: 14, color: colors.error, margin: '0 0 8px' }}>
              {state.context.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                send({ type: 'RETRY' });
                feedQuery.refetch();
              }}
              style={{
                border: `1px solid ${colors.borderWarm}`,
                background: colors.surfaceWarm,
                padding: '6px 16px',
                cursor: 'pointer',
                fontSize: 14,
                borderRadius: 8,
                color: colors.textPrimary,
              }}
            >
              {t('sharePhoto.retry')}
            </button>
          </div>
        )}

        {/* 피드 본문 */}
        {state.matches('idle') && (
          <>
            {/* 0건 */}
            {allItems.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64 }}>
                <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>
                  {t('page.lounge.noActivity')}
                </p>
              </div>
            )}

            {/* 일반 피드 */}
            {regularItems.map((item) => (
              <FeedItemRenderer key={item.id} item={item} loungeId={loungeId} />
            ))}

            {/* 무한스크롤 트리거 */}
            <div ref={observerRef} style={{ height: 1 }} />

            {feedQuery.isFetchingNextPage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 0',
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: 20,
                    height: 20,
                    border: `2px solid ${colors.borderWarm}`,
                    borderTopColor: colors.brand,
                    borderRadius: '50%',
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 참여자 목록 모달 ──────────────────────────────────────── */}
      {isModalOpen && (
        <ParticipantListModal
          entries={loungeCheckInItems}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---- 피드 아이템 렌더러 ----

function FeedItemRenderer({ item, loungeId }: { item: FeedItem; loungeId: string }) {
  switch (item.type) {
    case 'guestbook_entry':
      return <FeedItemGuestbookEntry item={item} loungeId={loungeId} />;
    case 'lounge_check_in':
      return <FeedItemLoungeCheckIn item={item} />;
    case 'host_announcement':
      return <FeedItemAnnouncementContainer item={item} loungeId={loungeId} />;
    case 'guestbook_message':
      return <FeedItemGuestbookMessage item={item} loungeId={loungeId} />;
    default:
      return null;
  }
}
