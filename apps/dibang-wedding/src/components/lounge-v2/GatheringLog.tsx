import { useMemo } from 'react';
import type { FeedItem } from '../../types/db-compat';
import { toLogRow, timeAgo } from '../../lib/loungeV2Feed';
import { maskGuestName } from '../../lib/guestLabel';
import type { LogKind } from '../../types/lounge-v2';

// 모이는 중 — 프로토타입 .log-section/.log-label/.log-row/.log-avatar/.la-label 정합.
// 활동 라벨은 아바타 아래 sans-serif 캡션(타입별 색, upright). 아바타=이니셜 폴백.
// [규칙 예외] 활동 캡션(Check in/Live/Enter/Post)만 12px — 사용자 명시 요청(2026-05-18).
// feedback_readable_font_size·project_lounge_v2_decisions(14px↑)의 의도적 예외이므로
// 폰트-최소규칙 일괄 적용 시 이 한 줄을 14px로 되돌리지 말 것.

const LABEL_COLOR: Record<LogKind, string> = {
  checkin: 'text-lng-live',
  enter: 'text-lng-blue',
  post: 'text-lng-amber',
  feed: 'text-lng-green',
  memory: 'text-lng-coral',
  event: 'text-lng-pink-ink',
};

interface GatheringLogProps {
  items: FeedItem[];
  hostNames: Set<string>;
}

export function GatheringLog({ items, hostNames }: GatheringLogProps) {
  const rows = useMemo(() => items.map(toLogRow), [items]);

  return (
    <section className="mx-4 mb-6 mt-2 px-[6px]">
      <div className="flex items-center px-[2px] pb-[12px]">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-lng-ink">모이는 중</h2>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-lng-muted">아직 활동이 없어요</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-[10px] border-b border-dashed border-black/[0.06] px-[2px] py-[9px] text-[14px] text-lng-muted last:border-b-0"
            >
              <span className="inline-flex w-[42px] shrink-0 flex-col items-center gap-[4px]">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-white bg-lng-pink text-[14px] font-semibold text-lng-brand shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.06)]">
                  {row.actorName.charAt(0)}
                </span>
                {/* 규칙 예외: 활동 캡션만 12px (사용자 명시, 2026-05-18) — 14px로 되돌리지 말 것 */}
                <span className={`whitespace-nowrap text-[12px] font-semibold leading-none tracking-[0.01em] ${LABEL_COLOR[row.kind]}`}>
                  {row.label}
                </span>
              </span>
              <p className="m-0 flex-1 leading-[1.45]">
                {row.relation && <span className="font-medium text-lng-ink">{row.relation} </span>}
                <span className="font-semibold text-lng-ink">{maskGuestName(row.actorName, hostNames)}</span>
                <span className="text-lng-muted">님이 {row.message}</span>
              </p>
              <span className="shrink-0 text-[14px] text-[#B0B0B8]">{timeAgo(row.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
