import { useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import type { FeedItem } from '@gorae/contracts';
import { toLogRow, liveMessageText, timeAgo } from '../../lib/loungeV2Feed';
import { maskGuestName } from '../../lib/guestLabel';

// LIVE 축하메시지 — 프로토타입 .live-section/.live-empty-card/.lec-*/.live-msg-card/.lmc-* 정합.
// 항상 노출. 메시지 없음=QR 안내 가로 카드(아이콘 좌+텍스트 우). 있음=8.5초 순차 순환 글래스 카드.

const ROTATE_MS = 8500;

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

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (liveMsgs.length <= 1) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % liveMsgs.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [liveMsgs.length]);

  const hasMsgs = liveMsgs.length > 0;

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
        <span className="text-[14px] font-medium tracking-[0.02em] text-lng-muted">축하메세지</span>
        {onOpenDisplay && (
          <button
            type="button"
            onClick={onOpenDisplay}
            aria-label="현장 디스플레이 전체보기"
            className="ml-auto flex items-center gap-1 rounded-full border border-[rgba(135,166,200,0.3)] bg-[rgba(255,255,255,0.6)] px-2.5 py-1 text-[12px] font-semibold text-[#3A5673] backdrop-blur"
          >
            <Maximize2 className="h-3.5 w-3.5" /> 전체보기
          </button>
        )}
      </div>

      {!hasMsgs ? (
        <div className="flex items-start gap-[14px] rounded-2xl border border-[rgba(135,166,200,0.18)] bg-[rgba(255,255,255,0.50)] px-[22px] py-[24px] backdrop-blur-[8px]">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[rgba(135,166,200,0.14)] text-[#4A6E99]">
            <QrIcon />
          </span>
          <p className="m-0 flex-1 text-[14px] leading-[1.55] tracking-[-0.01em] text-lng-ink">
            결혼식 당일, 현장의 <strong className="font-semibold text-[#3A5673]">QR을 스캔</strong>하고 축하메시지를 남겨주세요.
            <span className="mt-[6px] block text-[14px] text-lng-muted">식 종료 후 신랑신부에게 모아서 전달됩니다.</span>
          </p>
        </div>
      ) : (
        <div className="relative min-h-[160px] overflow-hidden rounded-2xl border border-[rgba(135,166,200,0.18)] bg-[rgba(255,255,255,0.40)] px-6 pb-14 pt-6 backdrop-blur-[12px]">
          <p
            key={liveMsgs[idx].id}
            className="m-0 animate-lng-live-slide pr-2 font-serif text-[17px] font-normal leading-[1.55] text-[#1F2A38]"
          >
            {liveMsgs[idx].text}
          </p>
          <p className="absolute bottom-[18px] left-6 m-0 text-[14px] font-medium tracking-[0.01em] text-[#647A93]">
            {liveMsgs[idx].relation && (
              <>
                <span className="text-[#4F6379]">{liveMsgs[idx].relation}</span>
                <span className="mx-[6px] text-[#8DA5BE]">·</span>
              </>
            )}
            <span className="font-semibold text-[#28384C]">{maskGuestName(liveMsgs[idx].name, hostNames)}</span>
          </p>
          <p className="absolute bottom-[18px] right-6 m-0 text-[14px] tracking-[0.01em] text-[#8DA5BE]">
            {timeAgo(liveMsgs[idx].createdAt)}
          </p>
        </div>
      )}
    </section>
  );
}
