import { useEffect, useLayoutEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { storyCarouselMachine } from '../../machines/storyCarousel.machine';
import {
  liveMessageText,
  feedPhotoUrl,
  feedViewCount,
  timeAgo,
} from '../../lib/loungeV2Feed';
import { maskGuestName } from '../../lib/guestLabel';
import type { StoryGroup } from '../../types/lounge-v2';

// 피드 카드 모달 — 인스타 스토리 2D.
// 프로필(groups) × 그 프로필의 글(group.items). 탭 우=다음 글/좌=이전 글
// (프로필 끝에서 인스타식 롤오버), 드래그(스와이프)=프로필 이동(양끝 멈춤),
// 진행바=현재 프로필 글 개수, 현재 바 5초 채움 후 다음(마지막의 마지막→닫힘),
// 카드 바깥 클릭=닫힘. 가시성·위치는 props 동기 파생(머신 타이밍 비의존).
// (W03 #4·#5: view 기록 mutation은 상위 컨테이너에서 주입 — onItemView 콜백만 호출,
//  SDK 직접 import 제거)

interface FeedCardModalProps {
  groups: StoryGroup[];
  openKey: string | null;
  onClose: () => void;
  /** 현재 보이는 guestbook_message 1회 조회 알림. 그 외 type은 호출되지 않음. */
  onItemView: (itemId: string) => void;
  hostNames: Set<string>;
}

const AUTO_MS = 5000;
const SWIPE_PX = 40;

export function FeedCardModal({ groups, openKey, onClose, onItemView, hostNames }: FeedCardModalProps) {
  const [state, send] = useMachine(storyCarouselMachine);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const seededKeyRef = useRef<string | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const startGroupIdx = openKey !== null ? groups.findIndex((g) => g.authorKey === openKey) : -1;
  const isOpen = startGroupIdx >= 0;

  useLayoutEffect(() => {
    if (startGroupIdx < 0) return;
    seededKeyRef.current = openKey;
    send({ type: 'OPEN', groupIndex: startGroupIdx, itemCounts: groups.map((g) => g.items.length) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  // 머신이 closed로 가면(마지막 글 끝의 NEXT_ITEM 또는 CLOSE) 부모에 1회 onClose.
  // open 의도(openKey 존재) + 시드된 키일 때만 — 초기/미오픈 closed는 무시(FCM 레이스 회피).
  useEffect(() => {
    if (openKey !== null && seededKeyRef.current === openKey && state.matches('closed')) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, openKey]);

  // 새 클릭 첫 렌더는 props(startGroupIdx, 0) — 머신 시드 지연 회피(FCM2).
  // ref.current를 render 중 비교하는 건 의도된 패턴(useLayoutEffect 이전 1프레임만 사용)
  // — react-hooks/refs는 우리 시나리오를 잘못 잡는 false-positive.
  // eslint-disable-next-line react-hooks/refs
  const seeded = seededKeyRef.current === openKey;
  const gi = seeded ? state.context.groupIndex : Math.max(0, startGroupIdx);
  const ii = seeded ? state.context.itemIndex : 0;
  const group = groups[gi];
  const items = group?.items ?? [];

  // 닫힘 트리거 → 머신 CLOSE. 실제 onClose는 머신 closed 진입 effect에서 단일 경로로(위).
  const handleClose = () => send({ type: 'CLOSE' });

  // 탭/스와이프/타이머 → 머신에 흐름 이벤트만 보낸다.
  // 롤오버(프로필 끝→다음 프로필 첫 글)·바운드(양끝 멈춤)·마지막의 마지막→닫힘 계산은 모두 머신(XS-5).
  const goNextItem = () => send({ type: 'NEXT_ITEM' });
  const goPrevItem = () => send({ type: 'PREV_ITEM' });
  const goNextProfile = () => send({ type: 'NEXT_PROFILE' });
  const goPrevProfile = () => send({ type: 'PREV_PROFILE' });

  // 5초 자동전환(다음 글, 롤오버·끝 닫힘). 위치 변경 시 deps(state) 바뀌어 리셋.
  useEffect(() => {
    if (!state.matches('playing')) return;
    const t = setTimeout(goNextItem, AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, send, onClose]);

  // 현재 보이는 피드 글(guestbook_message)을 1회 조회 기록.
  // 본인(작성자) 제외는 서버가 판정(FEED-3). 머신/닫힘 비의존 — self-close
  // 레이스(FCM)와 무관한 외부 기록(모달 상태를 바꾸지 않음).
  useEffect(() => {
    if (!isOpen) return;
    const it = items[ii];
    if (!it || it.type !== 'guestbook_message') return;
    if (viewedRef.current.has(it.id)) return;
    viewedRef.current.add(it.id);
    onItemView(it.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gi, ii]);

  if (!isOpen || !group || items.length === 0) return null;

  const item = items[ii] ?? items[0];

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  // 탭/스와이프 통합 처리(클릭/드래그 구분 race 없음).
  const onPointerUp = (e: React.PointerEvent) => {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNextProfile(); // 왼쪽으로 드래그 → 다음 프로필
      else goPrevProfile();        // 오른쪽으로 드래그 → 이전 프로필
      return;
    }
    // 탭: 카드 좌/우 절반 판정
    const rect = cardWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientX < rect.left + rect.width / 2) goPrevItem();
    else goNextItem();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onClick={(e) => {
        if (cardWrapRef.current && !cardWrapRef.current.contains(e.target as Node)) handleClose();
      }}
    >
      {/* progress bars — 현재 프로필의 글 개수만큼, 현재 바 5초 채움 */}
      <div className="flex gap-1 px-4 pt-4">
        {items.map((it, i) => (
          <span key={it.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            {i < ii ? (
              <span className="block h-full w-full bg-white" />
            ) : i === ii ? (
              <span
                key={`${gi}-${ii}`}
                className="block h-full w-0 bg-white"
                style={{ animation: `lng-story-fill ${AUTO_MS}ms linear forwards` }}
              />
            ) : (
              <span className="block h-full w-0 bg-white" />
            )}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        aria-label="닫기"
        className="absolute right-4 top-8 z-10 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-white/80"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex flex-1 items-center justify-center px-8">
        <div
          ref={cardWrapRef}
          className="relative w-full max-w-[340px] touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <article className="flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 bg-white px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lng-pink text-base font-semibold text-lng-brand">
                {group.authorName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-lng-ink">{maskGuestName(group.authorName, hostNames)}</p>
                {group.relation && (
                  <p className="truncate text-sm text-lng-muted">{group.relation}</p>
                )}
              </div>
              <span className="shrink-0 text-sm text-lng-muted">
                {timeAgo(item.created_at)}
                {item.type === 'guestbook_message' && ` · ${feedViewCount(item)}명이 봤어요`}
              </span>
            </div>
            {feedPhotoUrl(item) ? (
              <div className="relative flex-1">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${feedPhotoUrl(item)})` }}
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute inset-x-0 bottom-0 px-6 pb-6 font-serif text-lg leading-relaxed text-white">
                  {liveMessageText(item) || '함께한 마음을 남겼어요'}
                </p>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-[#FCEBDD] to-lng-pink px-7 py-8">
                <p className="text-center font-serif text-xl leading-relaxed text-lng-ink">
                  {liveMessageText(item) || '함께한 마음을 남겼어요'}
                </p>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
