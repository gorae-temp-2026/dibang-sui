import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useRef, useCallback, useState, useMemo } from 'react';
import { SharePhotosTab } from '../components/share-photos/SharePhotosTab';
import { getWeddingOptions, listRsvpsOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import type { CashGift, HostCreateCashGiftRequest, Rsvp } from '@gorae/contracts';
import { FeedItemGuestbookMessage } from '../components/lounge-feed/FeedItemGuestbookMessage';
import { useListCashGifts } from '../queries/ledger/useListCashGifts';
import { useGetCashGiftsSummary } from '../queries/ledger/useGetCashGiftsSummary';
import { useListFeed } from '../queries/ledger/useListFeed';
import { useUpdateCashGift } from '../queries/ledger/useUpdateCashGift';
import { useDeleteCashGift } from '../queries/ledger/useDeleteCashGift';
import { useCreateCashGift } from '../queries/ledger/useCreateCashGift';
import { LedgerTabContent } from '../components/ledger/LedgerTabContent';
import { DrawerOverlay } from '../components/ledger/DrawerOverlay';
import { GiftDetail } from '../components/ledger/GiftDetail';
import { GiftForm } from '../components/ledger/GiftForm';
import { formatAmount } from '../components/ledger/ledger-utils';
import { exportLedgerCsv } from '../lib/ledger-export';
import { useGetMe } from '../queries/shared/useGetMe';

type TabKey = 'ledger' | 'messages' | 'rsvp' | 'share-photos';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ledger', label: '장부' },
  { key: 'messages', label: '축하 메시지' },
  { key: 'rsvp', label: '참석 의사' },
  { key: 'share-photos', label: '받은 사진' },
];

// 탭 설명은 '장부' 탭에만 노출(QA 2026-05-29: 나머지 탭 설명 문구 삭제). 빈 문자열이면 미표시.
const TAB_DESCRIPTIONS: Record<TabKey, string> = {
  'share-photos': '',
  ledger: '장부는 본인만 열람할 수 있습니다',
  messages: '',
  rsvp: '',
};

// 참석 의사 RSVP 카드 — 측별 섹션에서 재사용 (#50)
function RsvpCard({ r }: { r: Rsvp }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{r.guest_name}</span>
        <span className={`text-sm px-2 py-0.5 rounded-full ${r.attendance === 'attending' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          {r.attendance === 'attending' ? '참석' : '불참'}
        </span>
      </div>
      <div className="mt-1 text-sm text-gray-400">
        동행 {r.companion_count}명 · 식사 {{ yes: '함', no: '안 함', undecided: '미정' }[r.meal]}
        {r.phone_last4 ? ` · ****${r.phone_last4}` : ''}
      </div>
    </div>
  );
}

export function LedgerPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('ledger');
  const [selectedGift, setSelectedGift] = useState<CashGift | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // --- Data Fetching ---
  const {
    data: giftsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isGiftsLoading,
  } = useListCashGifts(weddingId);

  const { data: summary } = useGetCashGiftsSummary(weddingId);

  // 축하 메시지 탭: loungeId는 wedding.lounge.id 에서 확보
  const { data: wedding } = useQuery({
    ...getWeddingOptions({ path: { weddingId: weddingId! } }),
    enabled: !!weddingId,
  });
  const loungeId = wedding?.lounge.id;

  // 장부 다운로드 파일 제목용 — 현재 호스트(장부 주인) 이름.
  const { data: me } = useGetMe();

  // G1: 참석 의사 — 측별 권한(자기 측만) 적용된 RSVP 목록. rsvp 탭 진입 시에만 조회.
  const { data: rsvpData } = useQuery({
    ...listRsvpsOptions({ path: { weddingId: weddingId! } }),
    enabled: !!weddingId && activeTab === 'rsvp',
  });

  // 축하 메시지 = 라운지 피드의 guestbook_message 항목 (장부 탭과 동일 무한쿼리 패턴).
  // 탭 진입 시에만 로드(불필요 호출 방지).
  const {
    data: feedData,
    fetchNextPage: fetchNextMsgPage,
    hasNextPage: hasNextMsgPage,
    isFetchingNextPage: isFetchingNextMsgPage,
    isLoading: isMessagesLoading,
  } = useListFeed(loungeId, activeTab === 'messages');

  const messages = (feedData?.pages.flatMap((p) => p.data) ?? []).filter(
    (item) => item.type === 'guestbook_message',
  );

  const gifts = useMemo(
    () => giftsData?.pages.flatMap((p) => p.data) ?? [],
    [giftsData],
  );

  const attendedTotal = useMemo(
    () => gifts.filter((g) => g.attended).reduce((sum, g) => sum + g.amount, 0),
    [gifts],
  );

  // --- Mutations ---
  // create는 queries/ledger/useCreateCashGift 훅 경유 (UI/데이터 분리 3-I). update/delete와 동일 패턴.
  const createMut = useCreateCashGift(weddingId);
  const updateMut = useUpdateCashGift(weddingId);
  const deleteMut = useDeleteCashGift(weddingId);

  // --- Infinite Scroll ---
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  // 축하 메시지 탭 전용 무한스크롤 observer (장부 ref와 분리 — 쿼리가 다름)
  const msgObserverRef = useRef<IntersectionObserver | null>(null);
  const lastMsgRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextMsgPage) return;
      if (msgObserverRef.current) msgObserverRef.current.disconnect();
      msgObserverRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextMsgPage) {
          fetchNextMsgPage();
        }
      });
      if (node) msgObserverRef.current.observe(node);
    },
    [isFetchingNextMsgPage, hasNextMsgPage, fetchNextMsgPage],
  );

  // --- CSV Export \u2014 lib/ledger-export.ts\uB85C \uBD84\uB9AC (UI/\uB370\uC774\uD130 \uBD84\uB9AC 3-I) ---
  const handleExport = () =>
    exportLedgerCsv(gifts, {
      groomName: wedding?.info.groom_name,
      brideName: wedding?.info.bride_name,
      date: wedding?.info.date,
      ownerName: me?.name,
    });

  // G1: 참석 의사 — 측별 권한상 자기 측 RSVP만 내려오지만, recipient_slot으로 신랑측/신부측 섹션 분리 (#50).
  const rsvps = rsvpData?.data ?? [];
  const groomRsvps = rsvps.filter((r) => r.recipient_slot.startsWith('groom'));
  const brideRsvps = rsvps.filter((r) => r.recipient_slot.startsWith('bride'));

  return (
    <div className="min-h-screen bg-gray-50 mx-auto max-w-[480px]">
      {/* Header — 라운지 TopBar와 동일하게 뒤로가기만. 'WEDDING REPORT'는 아래 Summary Card 제목으로 이동 (#56) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #A8C4D9, #8FB3CC)' }}>
          {/* 라운지 LoungeHeroCard의 eyebrow-in-card 패턴 (#56) */}
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/80 mb-3">Wedding Report</p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-white/70 mb-1">총 축의금</p>
              <p className="text-2xl font-bold font-serif tracking-tight text-white">
                {summary ? formatAmount(Number(summary.total_amount)) : '-'}
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-white/70 mb-1">현장 참석 축의금</p>
              <p className="text-2xl font-bold font-serif tracking-tight text-white">
                {formatAmount(attendedTotal)}
              </p>
            </div>
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <div>
              <span className="text-white/70">축의 건수</span>
              <span className="ml-2 font-medium text-white">{summary?.total_count ?? 0}건</span>
            </div>
            <div>
              <span className="text-white/70">참석</span>
              <span className="ml-2 font-medium text-white">{summary?.attended_count ?? 0}명</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#6A9AB8]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A9AB8]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Description — 빈 문자열 탭은 미표시. 장부 탭 설명은 LedgerTabContent의 버튼 행에서 좌측에 함께 표시 (#49) */}
        {activeTab !== 'ledger' && TAB_DESCRIPTIONS[activeTab] && (
          <p className="text-sm text-gray-400 text-center">{TAB_DESCRIPTIONS[activeTab]}</p>
        )}

        {/* Tab Content */}
        {activeTab === 'ledger' && (
          <LedgerTabContent
            gifts={gifts}
            isGiftsLoading={isGiftsLoading}
            isFetchingNextPage={isFetchingNextPage}
            lastCardRef={lastCardRef}
            onGiftClick={(gift) => { setSelectedGift(gift); setIsEditing(false); }}
            onExport={handleExport}
            onAdd={() => setShowAddForm(true)}
            note={TAB_DESCRIPTIONS.ledger}
          />
        )}

        {activeTab === 'messages' && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">
              Live 축하메세지 {messages.length}건
            </h2>
            {isMessagesLoading && (
              <p className="text-base text-gray-400 text-center py-16">불러오는 중...</p>
            )}
            {!isMessagesLoading && messages.length === 0 && (
              <p className="text-base text-gray-400 text-center py-16">아직 축하 메시지가 없습니다</p>
            )}
            {messages.map((item, idx) => (
              <div
                key={item.id}
                ref={idx === messages.length - 1 ? lastMsgRef : undefined}
              >
                <FeedItemGuestbookMessage item={item} loungeId={loungeId!} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rsvp' && (
          <div className="space-y-5">
            {rsvps.length === 0 ? (
              <p className="text-base text-gray-400 text-center py-16">아직 수집된 답변이 없습니다</p>
            ) : (
              <>
                {groomRsvps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">신랑측</h3>
                    {groomRsvps.map((r) => <RsvpCard key={r.id} r={r} />)}
                  </div>
                )}
                {brideRsvps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">신부측</h3>
                    {brideRsvps.map((r) => <RsvpCard key={r.id} r={r} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'share-photos' && loungeId && (
          <SharePhotosTab loungeId={loungeId} />
        )}
      </div>

      {/* Detail Drawer */}
      {selectedGift && !isEditing && (
        <DrawerOverlay onClose={() => setSelectedGift(null)}>
          <GiftDetail
            gift={selectedGift}
            onEdit={() => setIsEditing(true)}
            onDelete={() => setDeleteConfirm(selectedGift.id)}
          />
        </DrawerOverlay>
      )}

      {/* Edit Form Drawer */}
      {selectedGift && isEditing && (
        <DrawerOverlay onClose={() => setIsEditing(false)}>
          <GiftForm
            title="축의 수정"
            initial={selectedGift}
            onSubmit={(values) =>
              updateMut.mutate(
                {
                  path: { weddingId: weddingId!, giftId: selectedGift.id },
                  body: values,
                },
                {
                  onSuccess: (updated) => {
                    setSelectedGift(updated as CashGift);
                    setIsEditing(false);
                  },
                },
              )
            }
            submitLabel="수정하기"
            isLoading={updateMut.isPending}
          />
        </DrawerOverlay>
      )}

      {/* Add Form Drawer */}
      {showAddForm && (
        <DrawerOverlay onClose={() => setShowAddForm(false)}>
          <GiftForm
            title="내역 추가"
            onSubmit={(values) =>
              createMut.mutate({
                path: { weddingId: weddingId! },
                body: values as HostCreateCashGiftRequest,
              })
            }
            submitLabel="추가하기"
            isLoading={createMut.isPending}
          />
        </DrawerOverlay>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs mx-4 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-medium text-gray-900">이 축의 내역을 삭제할까요?</p>
            <p className="text-sm text-gray-500">삭제하면 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm">
                취소
              </button>
              <button
                onClick={() =>
                  deleteMut.mutate(
                    { path: { weddingId: weddingId!, giftId: deleteConfirm } },
                    {
                      onSuccess: () => {
                        setSelectedGift(null);
                        setDeleteConfirm(null);
                      },
                    },
                  )
                }
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
