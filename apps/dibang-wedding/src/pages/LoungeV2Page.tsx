import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Megaphone, PenLine, LayoutGrid, Gift } from 'lucide-react';
import { useMachine } from '@xstate/react';
import type { FeedItem } from '../types/db-compat';
import { loungeV2Machine } from '../machines/loungeV2.machine';
import { buildDisplayUrl, buildSharePhotoUploadPath } from '../lib/external-urls';
import { useGetLounge } from '../queries/lounge-feed/useGetLounge';
import { useGetWedding } from '../queries/lounge-feed/useGetWedding';
import { useGetFeed } from '../queries/lounge-feed/useGetFeed';
import { useGetAnnouncements } from '../queries/lounge-feed/useGetAnnouncements';
import { useCreateAnnouncement } from '../queries/lounge-feed/useCreateAnnouncement';
import { useDeleteAnnouncement } from '../queries/lounge-feed/useDeleteAnnouncement';
import { useEnsureLoungeCheckIn } from '../queries/lounge-feed/useEnsureLoungeCheckIn';
import { useMemoriesRealtime } from '../queries/lounge-v2/useMemoriesRealtime';
import { useRecordGuestbookMessageView } from '../queries/lounge-v2/useRecordGuestbookMessageView';
import { useGetMe } from '../queries/shared/useGetMe';
import { useWarmth } from '../hooks/lounge-v2/useWarmth';
import { useStoryGroups } from '../hooks/lounge-v2/useStoryGroups';
import { useComposeMemory } from '../hooks/lounge-v2/useComposeMemory';
import { TopBarV2 } from '../components/lounge-v2/TopBarV2';
import { LoungeHeroCard } from '../components/lounge-v2/LoungeHeroCard';
import { AnnounceMarquee } from '../components/lounge-v2/AnnounceMarquee';
import { StoryStrip } from '../components/lounge-v2/StoryStrip';
import { FeedCardModal } from '../components/lounge-v2/FeedCardModal';
import { LiveCelebration } from '../components/lounge-v2/LiveCelebration';
import { GatheringLog } from '../components/lounge-v2/GatheringLog';
import { LoungeRail } from '../components/lounge-v2/LoungeRail';
import { MoiGatherPreviewCard } from '../components/lounge-v2/MoiGatherPreviewCard';
import { GiftSheet } from '../components/lounge-v2/GiftSheet';
import { ComposeModal } from '../components/lounge-v2/ComposeModal';
import { AnnouncementForm } from '../components/lounge-feed/AnnouncementForm';
import { useT } from '../lib/i18n';

// 웨딩 라운지 V2 — 섹션 합성 페이지 (/lounge/:loungeId/v2).
// V1 LoungeFeedPage는 무수정. 같은 라운지 데이터를 V2 정보구조로 재배치.

export function LoungeV2Page() {
  const { loungeId } = useParams<{ loungeId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [state, send] = useMachine(loungeV2Machine);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const [openStoryKey, setOpenStoryKey] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  // 입장 시 LoungeCheckIn 자동 생성 (V1 패턴, 1회만)
  useEnsureLoungeCheckIn(loungeId);

  const loungeQuery = useGetLounge(loungeId ?? '');
  const weddingId = loungeQuery.data?.wedding_id;
  const weddingQuery = useGetWedding(weddingId);
  const feedQuery = useGetFeed(loungeId ?? '');
  const announcementsQuery = useGetAnnouncements(loungeId ?? '');
  const createAnnouncement = useCreateAnnouncement(loungeId ?? '');
  const deleteAnnouncement = useDeleteAnnouncement(loungeId ?? '');
  const meQuery = useGetMe();

  // Memory Realtime 구독 (SCENARIOS.md S-06: 즉시 반영)
  useMemoriesRealtime(loungeId ?? '');

  // 컴포즈(작성) + view 기록 — 자식 컴포넌트가 직접 호출하던 데이터 책임을 컨테이너로 끌어올림.
  const compose = useComposeMemory(loungeId ?? '');
  const recordView = useRecordGuestbookMessageView();

  // 호스트 판별 — 공지 FAB 노출 여부 결정용 (호스트에게만 노출).
  const myId = meQuery.data?.id;
  const wedding = weddingQuery.data;

  // 공지 등록자 측(신랑측/신부측) 매핑 — Announcement.host_id → 측 (#54)
  const hostSideMap: Record<string, string> = {};
  if (wedding) {
    const h = wedding.hosts;
    [h.host_groom_id, h.host_groom_father_id, h.host_groom_mother_id].forEach((id) => { if (id) hostSideMap[id] = t('curate.side.groom'); });
    [h.host_bride_id, h.host_bride_father_id, h.host_bride_mother_id].forEach((id) => { if (id) hostSideMap[id] = t('curate.side.bride'); });
  }
  const isHost = !!myId && !!wedding && [
    wedding.hosts.host_groom_id,
    wedding.hosts.host_bride_id,
    wedding.hosts.host_groom_father_id,
    wedding.hosts.host_groom_mother_id,
    wedding.hosts.host_bride_father_id,
    wedding.hosts.host_bride_mother_id,
  ].includes(myId);

  const allItems: FeedItem[] = feedQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const warmth = useWarmth(allItems);
  const storyGroups = useStoryGroups(allItems);
  const feedGroups = useMemo(() => storyGroups.filter((g) => g.hasFeed), [storyGroups]);
  // 라운지 이름 마스킹용 호스트(신랑·신부·양가 혼주) 실명 집합 — 이 6명만 실명 노출.
  const hostNames = useMemo(() => {
    const i = weddingQuery.data?.info;
    return new Set(
      [
        i?.groom_name,
        i?.bride_name,
        i?.groom_father_name,
        i?.groom_mother_name,
        i?.bride_father_name,
        i?.bride_mother_name,
      ].filter((n): n is string => !!n),
    );
  }, [weddingQuery.data]);
  const announcements = announcementsQuery.data?.data ?? [];
  const currentAnnouncement = announcements[0];

  const handleSubmitAnnouncement = (msg: string) => {
    if (!loungeId) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      createAnnouncement.mutate(
        { path: { loungeId }, body: { message: msg } },
        {
          onSuccess: () => {
            setAnnounceOpen(false);
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

  // xState ↔ TanStack Query 동기화
  useEffect(() => {
    if (feedQuery.isSuccess && state.matches('loading')) send({ type: 'LOAD_SUCCESS' });
    if (feedQuery.isError && state.matches('loading'))
      send({ type: 'LOAD_ERROR', error: feedQuery.error ? String(feedQuery.error) : 'Unknown error' });
  }, [feedQuery.isSuccess, feedQuery.isError, feedQuery.error, state, send]);

  // 무한스크롤
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
    // feedQuery 객체 전체는 매 렌더마다 새 참조 — 필요 필드만 명시(무한 재구독 회피).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage]);

  // 풀다운 새로고침
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    pullDistance.current = (e.touches[0]?.clientY ?? 0) - touchStartY.current;
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80 && state.matches('idle')) {
      send({ type: 'REFRESH' });
      feedQuery.refetch().then(
        () => send({ type: 'REFRESH_SUCCESS' }),
        (err: unknown) =>
          send({ type: 'REFRESH_ERROR', error: err instanceof Error ? err.message : 'Refresh failed' }),
      );
    }
    pullDistance.current = 0;
  }, [state, send, feedQuery]);

  if (!loungeId) {
    return <div className="p-4 text-base text-lng-muted">{t('page.lounge.noLoungeId')}</div>;
  }

  const info = weddingQuery.data?.info;
  const isLoading = (loungeQuery.isLoading || weddingQuery.isLoading) && !info;

  return (
    <div
      className="relative mx-auto min-h-screen max-w-[480px] bg-lng-surface pb-[96px]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <TopBarV2
        title={info ? t('page.lounge.loungeOf', { names: `${info.groom_name} · ${info.bride_name}` }) : t('page.lounge.lounge')}
        warmthLabel={warmth.label}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-lng-line border-t-lng-brand" />
        </div>
      ) : (
        <>
          <LoungeHeroCard
            groomName={info?.groom_name ?? ''}
            brideName={info?.bride_name ?? ''}
            groomFatherName={info?.groom_father_name}
            groomMotherName={info?.groom_mother_name}
            brideFatherName={info?.bride_father_name}
            brideMotherName={info?.bride_mother_name}
            warmthLabel={warmth.label}
            onSharePhoto={() => navigate(buildSharePhotoUploadPath(loungeId))}
          />

          <MoiGatherPreviewCard onEnter={() => navigate(`/lounge/${loungeId}/moi-gather`)} />

          <AnnounceMarquee announcements={announcements} hostSideMap={hostSideMap} />

          <StoryStrip groups={storyGroups} onOpenStory={setOpenStoryKey} hostNames={hostNames} />

          <LiveCelebration
            items={allItems}
            hostNames={hostNames}
            onOpenDisplay={
              weddingId ? () => window.open(buildDisplayUrl(weddingId), '_blank', 'noopener,noreferrer') : undefined
            }
          />

          {state.matches('refreshing') && (
            <p className="py-3 text-center text-sm text-lng-muted">{t('page.lounge.refreshing')}</p>
          )}

          {state.matches('error') ? (
            <div className="mx-4 my-6 rounded-2xl border border-lng-line bg-white p-4 text-center">
              <p className="mb-2 text-sm text-lng-coral">{state.context.errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  send({ type: 'RETRY' });
                  feedQuery.refetch();
                }}
                className="rounded-lg border border-lng-line bg-lng-surface px-4 py-1.5 text-sm text-lng-ink"
              >
                {t('sharePhoto.retry')}
              </button>
            </div>
          ) : (
            <GatheringLog items={allItems} hostNames={hostNames} />
          )}

          <div ref={observerRef} className="h-px" />
          {feedQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-lng-line border-t-lng-brand" />
            </div>
          )}
        </>
      )}

      {/* 우측 액션 레일 — 접이식(공지 host·메모리·피드·들러리선물). 디스플레이는 제거 → LIVE 카드 ⛶.
          모이가모인곳·샵은 레일에서 제외(미리보기 카드 / 미니룸 내부). 핸드오프 §12-1·§12-4. */}
      <LoungeRail
        actions={[
          ...(isHost
            ? [
                {
                  key: 'announce',
                  label: t('page.lounge.announcement'),
                  icon: <Megaphone className="h-[19px] w-[19px]" />,
                  onClick: () => setAnnounceOpen(true),
                },
              ]
            : []),
          { key: 'memory', label: t('page.lounge.railMemory'), icon: <PenLine className="h-[19px] w-[19px]" />, onClick: () => setComposeOpen(true) },
          // TODO: 메모리 vs 피드 compose 모드 분리 (현재 동일 ComposeModal — 핸드오프 §2-3은 둘 다 "기존 compose").
          { key: 'feed', label: t('page.lounge.railFeed'), icon: <LayoutGrid className="h-[19px] w-[19px]" />, onClick: () => setComposeOpen(true) },
          { key: 'gift', label: t('page.lounge.railGift'), icon: <Gift className="h-[19px] w-[19px]" />, onClick: () => setGiftOpen(true) },
        ]}
      />

      {/* Announcement Modal — issue #31 */}
      {announceOpen && loungeId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setAnnounceOpen(false)}>
          <div className="m-4 w-full max-w-[420px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('page.lounge.writeAnnouncement')}</h3>
              <button type="button" aria-label={t('page.lounge.close')} onClick={() => setAnnounceOpen(false)} className="text-2xl leading-none">&times;</button>
            </div>
            <AnnouncementForm
              currentAnnouncement={currentAnnouncement}
              onSubmit={handleSubmitAnnouncement}
              onDelete={handleDeleteAnnouncement}
              isSubmitting={createAnnouncement.isPending}
              isDeleting={deleteAnnouncement.isPending}
            />
          </div>
        </div>
      )}

      <FeedCardModal
        groups={feedGroups}
        openKey={openStoryKey}
        onClose={() => setOpenStoryKey(null)}
        onItemView={(itemId) => recordView.mutate(itemId)}
        hostNames={hostNames}
      />
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        currentUserName={meQuery.data?.name ?? t('page.lounge.me')}
        onSubmit={compose.submit}
        isUploading={compose.isUploading}
        isPosting={compose.isPosting}
        uploadError={compose.uploadError}
        postError={compose.postError}
      />
      <GiftSheet open={giftOpen} onOpenChange={setGiftOpen} />
    </div>
  );
}
