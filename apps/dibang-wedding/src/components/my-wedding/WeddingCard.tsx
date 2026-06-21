import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { WeddingSummary } from '@gorae/contracts';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { renderQrToCanvas, downloadQrAsPng } from '../../lib/qr-render';
import { HostSlotSectionContainer } from './HostSlotSectionContainer';
import { useT } from '../../lib/i18n';

function formatDday(dateStr: string): string {
  const wedding = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function formatTime(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 || 12;
  return `${ampm} ${h12}:${m}`;
}

// UI/데이터 분리 P2-1: share/copy/외부 nav는 page 콜백으로 위임. QR rendering·다운로드는
// lib/qr-render로 분리. WeddingCard는 invitation slug만 알고 URL 조립은 page 책임.
// guestFlowUrl은 page가 조립해 prop으로 주입(QR 표시·복사 한 URL을 공유하기 위함).
interface WeddingCardProps {
  wedding: WeddingSummary;
  /** 청첩장 링크 복사 후 page에서 toast 등 피드백 띄우기용 트리거 */
  onCopyLink: () => void;
  /** 청첩장 링크 공유 (Web Share API 또는 fallback copy) */
  onShareInvitation: (slug: string) => void;
  /** 청첩장 링크 복사 (clipboard) */
  onCopyInvitationLink: (slug: string) => void;
  /** 청첩장 미리보기 새 탭 열기 */
  onOpenInvitationPreview: (slug: string) => void;
  /** QR 표시·다운로드용 게스트 플로우 URL */
  guestFlowUrl: string;
  /** invite token URL 조립용 origin (HostSlotSectionContainer에 forward) — 라운드 3 A2 */
  inviteOrigin: string;
  /** invite share 콜백 (HostSlotSectionContainer에 forward) — 라운드 3 A2 */
  onShareInvite: (url: string) => Promise<void> | void;
}

export function WeddingCard({
  wedding,
  onCopyLink,
  onShareInvitation,
  onCopyInvitationLink,
  onOpenInvitationPreview,
  guestFlowUrl,
  inviteOrigin,
  onShareInvite,
}: WeddingCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const d = new Date(wedding.date);
  const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];
  const dday = formatDday(wedding.date);

  const invitations = wedding.invitations ?? [];
  const myRole = wedding.my_role;
  const isOwner = myRole === 'groom' || myRole === 'bride';
  const [hostSlotOpen, setHostSlotOpen] = useState(false);

  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Share popover state — tracks which invitation's popover is open
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const sharePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const width = el.clientWidth;
      if (width === 0) return;
      setCurrentIndex(Math.round(scrollLeft / width));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // 바깥 클릭 시 팝오버 닫기 (다음 틱 등록 — 여는 클릭이 바로 닫기를 트리거하지 않게)
  useOutsideClick(sharePopoverRef, () => setShareOpenId(null), shareOpenId !== null);

  const handleCopyLink = (slug: string) => {
    setShareOpenId(null);
    onCopyInvitationLink(slug);
  };

  const handleKakao = (slug: string) => {
    setShareOpenId(null);
    onShareInvitation(slug);
  };

  const [qrOpen, setQrOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQrOpen(true);
  };

  const handleQrModalOpen = useCallback(() => {
    if (!qrCanvasRef.current) return;
    renderQrToCanvas(qrCanvasRef.current, guestFlowUrl);
  }, [guestFlowUrl]);

  const handleQrDownload = () => {
    if (!qrCanvasRef.current) return;
    downloadQrAsPng(qrCanvasRef.current, `wedding-qr-${wedding.id.slice(0, 8)}.png`);
  };

  // 라운지 정보 없을 때 인라인 모달 — alert() 대체 (사내 ToastProvider 미마운트 상태이므로 modal 후퇴)
  const [loungeErrorOpen, setLoungeErrorOpen] = useState(false);

  // 2-H: wedding.lounge_id가 listMyWeddings 응답에 포함됨 (api-contract WeddingSummary).
  // 카드에서 추가 fetch 없이 직접 navigate. lounge_id 없으면 에러 모달.
  const handleLounge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wedding.lounge_id) {
      navigate(`/lounge/${wedding.lounge_id}/v2`);
    } else {
      setLoungeErrorOpen(true);
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/wedding/${wedding.id}/report`);
  };

  const handleMemoryBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/wedding/${wedding.id}/memory-book`);
  };

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card transition-all hover:border-soft-sky p-3 space-y-3">
      {/* Invitation cover carousel */}
      {invitations.length > 0 ? (
        <div className="relative">
          <div
            ref={carouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-xl"
          >
            {invitations.map((inv) => {
              const hasCover = !!inv.cover_image;
              return (
                <div
                  key={inv.id}
                  className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-sky-100 to-sky-200 cursor-pointer group snap-center shrink-0"
                  style={hasCover ? { backgroundImage: `url(${inv.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  onClick={() => inv.slug ? onOpenInvitationPreview(inv.slug) : navigate(`/invitation/edit/${wedding.id}`)}
                >
                  <div className="absolute top-3 right-3">
                    <span className="inline-block rounded-full bg-black/40 px-2.5 py-0.5 text-sm font-semibold text-white">
                      {dday}
                    </span>
                  </div>
                  {/* 공유 버튼 (좌측 하단) */}
                  <div ref={shareOpenId === inv.id ? sharePopoverRef : undefined} className="absolute bottom-3 left-3 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShareOpenId(shareOpenId === inv.id ? null : inv.id); }}
                      className="rounded-lg bg-gray-700/80 p-2.5 text-white hover:bg-gray-800 transition-colors"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                    {shareOpenId === inv.id && (
                      <div
                        className="absolute bottom-full left-0 mb-2 w-44 rounded-xl bg-white shadow-lg border border-gray-100 py-1 z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleKakao(inv.slug)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                            <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.6-.15.56-.96 3.56-.99 3.78 0 0-.02.17.09.23.1.06.23.01.23.01.3-.04 3.5-2.3 4.05-2.7.62.09 1.27.14 1.97.14 5.52 0 10-3.58 10-7.96C22 6.58 17.52 3 12 3z" />
                          </svg>
                          카카오톡 공유
                        </button>
                        <button
                          onClick={() => handleCopyLink(inv.slug)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          링크 복사
                        </button>
                      </div>
                    )}
                  </div>
                  {/* 수정하기 버튼 (우측 하단) — 신랑/신부만 */}
                  {isOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/invitation/edit/${wedding.id}?invitationId=${inv.id}`); }}
                      className="absolute bottom-3 right-3 z-10 rounded-lg bg-gray-700/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                      수정하기
                    </button>
                  )}
                  {hasCover ? (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <span className="rounded-lg bg-black/60 px-4 py-2 text-base font-semibold text-white">청첩장 열기</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base text-gray-400">커버 이미지를 등록하세요</span>
                    </div>
                  )}
                </div>
              );
            })}
            {/* 청첩장 추가 카드 — 일단 주석 처리 (QA-16) */}
            {/* {isOwner && (
              <div
                className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-soft-sky bg-pale-sky/30 cursor-pointer snap-center shrink-0 flex flex-col items-center justify-center hover:bg-pale-sky/60 transition-colors"
                onClick={() => navigate(`/invitation/create?weddingId=${wedding.id}`)}
              >
                <span className="text-3xl text-soft-sky mb-2">+</span>
                <span className="text-sm font-semibold text-navy">청첩장 추가</span>
              </div>
            )} */}
          </div>
          {/* Page indicator dots */}
          {(() => {
            const totalSlides = invitations.length; /* 청첩장 추가 카드 주석 처리됨 (QA-16) */
            return totalSlides > 1 ? (
              <div className="flex justify-center gap-1.5 mt-2">
                {Array.from({ length: totalSlides }, (_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-gray-700' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            ) : null;
          })()}
        </div>
      ) : (
        <div
          className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-sky-100 to-sky-200 cursor-pointer"
          onClick={() => navigate(`/invitation/edit/${wedding.id}`)}
        >
          <div className="absolute top-3 right-3">
            <span className="inline-block rounded-full bg-black/40 px-2.5 py-0.5 text-sm font-semibold text-white">
              {dday}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base text-gray-400">커버 이미지를 등록하세요</span>
          </div>
        </div>
      )}

      {/* Wedding basic info */}
      <div className="px-1 -mt-1">
        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#1E3A5F] px-2.5 py-0.5 text-xs font-bold text-white">
          💍 {t('events.badge.wedding')}
        </span>
        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          {wedding.groom_name} & {wedding.bride_name}
          {myRole && (
            <span className="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-sm font-medium text-sky-700">
              {{ groom: '신랑', bride: '신부', groom_father: '신랑 아버지', groom_mother: '신랑 어머니', bride_father: '신부 아버지', bride_mother: '신부 어머니' }[myRole]}
            </span>
          )}
        </h3>
        <p className="text-base text-gray-600 mt-0.5">
          {formatted} ({dayName}) {formatTime(wedding.time)}
        </p>
        {wedding.venue_name && (
          <p className="text-base text-gray-700 mt-0.5">
            {wedding.venue_name}{wedding.venue_hall ? ` ${wedding.venue_hall}` : ''}
          </p>
        )}
        {(wedding.groom_father_name || wedding.groom_mother_name || wedding.bride_father_name || wedding.bride_mother_name) && (
          <div className="flex items-start justify-between mt-1">
            <div className="text-sm text-gray-500 leading-relaxed">
              {(wedding.groom_father_name || wedding.groom_mother_name) && (
                <p>신랑 부모 {wedding.groom_father_name ?? ''} {wedding.groom_mother_name ?? ''}</p>
              )}
              {(wedding.bride_father_name || wedding.bride_mother_name) && (
                <p>신부 부모 {wedding.bride_father_name ?? ''} {wedding.bride_mother_name ?? ''}</p>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => setHostSlotOpen(true)}
                className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-sm font-medium text-sky-700 hover:bg-sky-100 transition-colors"
              >
                배우자·혼주 초대
              </button>
            )}
          </div>
        )}
      </div>

      {/* 배우자·혼주 초대 팝오버 */}
      {hostSlotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setHostSlotOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">배우자·혼주 초대</h3>
              <button onClick={() => setHostSlotOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <HostSlotSectionContainer
              weddingId={wedding.id}
              wedding={wedding}
              myRole={myRole}
              onCopyLink={onCopyLink}
              inviteOrigin={inviteOrigin}
              onShareInvite={onShareInvite}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-2 px-1">
        <button onClick={handleReport} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-sm font-medium">리포트</span>
        </button>
        <button onClick={handleLounge} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-sm font-medium">라운지</span>
        </button>
        <button onClick={handleQR} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="14" y="2" width="8" height="8" rx="1" />
            <rect x="2" y="14" width="8" height="8" rx="1" />
            <path d="M14 14h2v2h-2zM20 14h2v2h-2zM14 20h2v2h-2zM20 20h2v2h-2zM17 17h2v2h-2z" />
          </svg>
          <span className="text-sm font-medium">축의 QR</span>
        </button>
        <button onClick={handleMemoryBook} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="text-sm font-medium">메모리북</span>
        </button>
      </div>

      {/* QR Modal — 결혼식 QR (Guest Web 플로우) */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQrOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs mx-4 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">축의 QR</h3>
            <p className="text-sm text-gray-500">현장에서 하객이 스캔하고 축의하는 QR입니다. (출입증) 안내해서 축의대에 비치하세요!</p>
            <div className="flex justify-center">
              {/* 디버깅용: 하단 링크 텍스트 제거, QR 클릭 시 해당 링크를 새 탭으로 연다. */}
              <button
                type="button"
                onClick={() => window.open(guestFlowUrl, '_blank', 'noopener,noreferrer')}
                aria-label="QR 링크 새 탭으로 열기"
                className="rounded-lg"
              >
                <canvas ref={(el) => { qrCanvasRef.current = el; if (el) handleQrModalOpen(); }} className="rounded-lg" />
              </button>
            </div>
            <button
              onClick={handleQrDownload}
              className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-base font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              PNG 다운로드
            </button>
            <button
              onClick={() => setQrOpen(false)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Lounge fetch 실패 모달 — alert() 대체 */}
      {loungeErrorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLoungeErrorOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs mx-4 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">라운지 정보를 가져올 수 없습니다</h3>
            <p className="text-sm text-gray-500">잠시 후 다시 시도해 주세요.</p>
            <button
              onClick={() => setLoungeErrorOpen(false)}
              className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-base font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
