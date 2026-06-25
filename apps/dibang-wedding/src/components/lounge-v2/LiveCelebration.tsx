import { useEffect, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { Maximize } from 'lucide-react';
import type { FeedItem } from '../../types/db-compat';
import { toLogRow, liveMessageText, timeAgo } from '../../lib/loungeV2Feed';
import { maskGuestName } from '../../lib/guestLabel';
import { useT } from '../../lib/i18n';
import { liveCelebrationMachine } from '../../machines/liveCelebration.machine';

// LIVE 축하메시지 — 프로토타입 .live-section/.live-empty-card/.lec-*/.live-msg-card/.lmc-* 정합.
// 항상 노출. 메시지 없음=QR 안내 가로 카드(아이콘 좌+텍스트 우). 있음=8.5초 순차 순환 글래스 카드.
// 순환 idx + 타이머는 liveCelebrationMachine이 소유(메시지 수는 SET_COUNT로 주입).

interface LiveCelebrationProps {
  items: FeedItem[];
  hostNames: Set<string>;
  /** ⛶ 전체보기 → MEC Display(guest-web /display) 새 탭. 디스플레이 FAB 대체(핸드오프 §12-4). */
  onOpenDisplay?: () => void;
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2zM20 14h2v2h-2zM14 20h2v2h-2zM20 20h2v2h-2zM17 17h2v2h-2z" />
    </svg>
  );
}

export function LiveCelebration({ items, hostNames, onOpenDisplay }: LiveCelebrationProps) {
  const t = useT();
  const liveMsgs = useMemo(
    () =>
      items
        .filter((i) => i.type === 'guestbook_message' && liveMessageText(i) !== '')
        .map((i) => {
          const row = toLogRow(i);
          return { id: i.id, name: row.actorName, relation: row.relation, text: liveMessageText(i), createdAt: i.created_at };
        }),
    [items],
  );

  const [state, send] = useMachine(liveCelebrationMachine);
  useEffect(() => {
    send({ type: 'SET_COUNT', count: liveMsgs.length });
  }, [liveMsgs.length, send]);
  const idx = state.context.idx;

  const hasMsgs = liveMsgs.length > 0;
  // 머신 idx가 새 count로 클램프되기 직전 순간의 out-of-range 렌더 보호.
  const safeIdx = idx < liveMsgs.length ? idx : 0;

  return (
    <section className="mx-4 mb-[6px] mt-4">
      <div className="flex items-center gap-[9px] px-[6px] pb-[10px]">
        <span
          className={`inline-flex items-center gap-[5px] rounded-full bg-[rgba(224,58,58,0.10)] px-[9px] py-[3px] text-[14px] font-bold tracking-[0.06em] text-lng-live ${
            hasMsgs ? 'animate-lng-live-blink' : ''
          }`}
        >
          <span className="h-[5px] w-[5px] rounded-full bg-lng-live" />
          LIVE
        </span>
        <span className="text-[14px] font-medium tracking-[0.02em] text-lng-muted">{t('loungeV2.live.label')}</span>
      </div>

      {!hasMsgs ? (
        <div className="relative flex items-start gap-[14px] rounded-2xl border border-[rgba(135,166,200,0.18)] bg-[rgba(255,255,255,0.50)] px-[22px] py-[24px] backdrop-blur-[8px]">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[rgba(135,166,200,0.14)] text-[#4A6E99]">
            <QrIcon />
          </span>
          <p className="m-0 flex-1 text-[14px] leading-[1.55] tracking-[-0.01em] text-lng-ink">
            {t('loungeV2.live.qrPre')}<strong className="font-semibold text-[#3A5673]">{t('loungeV2.live.qrEmphasis')}</strong>{t('loungeV2.live.qrPost')}
            <span className="mt-[6px] block text-[14px] text-lng-muted">{t('loungeV2.live.qrHint')}</span>
          </p>
          {onOpenDisplay && (
            <button type="button" onClick={onOpenDisplay} aria-label={t('loungeV2.live.openDisplay')} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur">
              <Maximize className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative min-h-[160px] overflow-hidden rounded-2xl border border-[rgba(135,166,200,0.18)] bg-[rgba(255,255,255,0.40)] px-6 pb-14 pt-6 backdrop-blur-[12px]">
          <p
            key={liveMsgs[safeIdx].id}
            className="m-0 animate-lng-live-slide pr-2 font-serif text-[17px] font-normal leading-[1.55] text-[#1F2A38]"
          >
            {liveMsgs[safeIdx].text}
          </p>
          <p className="absolute bottom-[18px] left-6 m-0 text-[14px] font-medium tracking-[0.01em] text-[#647A93]">
            {liveMsgs[safeIdx].relation && (
              <>
                <span className="text-[#4F6379]">{liveMsgs[safeIdx].relation}</span>
                <span className="mx-[6px] text-[#8DA5BE]">·</span>
              </>
            )}
            <span className="font-semibold text-[#28384C]">{maskGuestName(liveMsgs[safeIdx].name, hostNames)}</span>
          </p>
          <p className="absolute bottom-[18px] right-12 m-0 text-[14px] tracking-[0.01em] text-[#8DA5BE]">
            {timeAgo(liveMsgs[safeIdx].createdAt)}
          </p>
          {onOpenDisplay && (
            <button type="button" onClick={onOpenDisplay} aria-label={t('loungeV2.live.openDisplay')} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur">
              <Maximize className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
