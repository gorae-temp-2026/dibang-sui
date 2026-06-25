import type { Announcement } from '../../types/db-compat';
import { useT } from '../../lib/i18n';

// 공지 marquee — 프로토타입 .announce-row.marquee-row/.announce-ticker/.announce-msg 정합.
// pl-[100%] + 메시지 2벌 + translateX 0→-100%(lng-marquee 36s)로 끊김 없는 좌→우 흐름.
// 공지 0개면 영역 숨김. 호버 일시정지.
// host_id → 신랑측/신부측 매핑(상위에서 hostSideMap 주입)으로 등록자 측을 '공지' 배지 옆에 표기 (#54).
// (W03 #1 C4: announcements는 상위 컨테이너에서 주입 — 자가 fetch 제거)

interface AnnounceMarqueeProps {
  announcements: Announcement[];
  hostSideMap?: Record<string, string>;
}

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 2.5v11l-7-2.5v-6L14 2.5zM2 5.5h4v5H2v-5zM5 11h2.5L9 14H6.5L5 11z" />
    </svg>
  );
}

function MarqueeRow({ announcements, hostSideMap }: { announcements: Announcement[]; hostSideMap?: Record<string, string> }) {
  const t = useT();
  return (
    <>
      {announcements.map((a) => {
        const side = hostSideMap?.[a.host_id];
        return (
          <span key={a.id} className="inline-flex shrink-0 items-center gap-[7px] pr-[80px]">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-lng-brand">
              <SpeakerIcon />
            </span>
            <span className="shrink-0 rounded-full bg-lng-pink px-[6px] py-[2px] text-[14px] font-bold tracking-[0.04em] text-lng-pink-ink">
              {t('loungeV2.announce.badge')}
            </span>
            {side && (
              <span className="shrink-0 text-[14px] font-medium text-lng-brand">{side}</span>
            )}
            <span className="whitespace-nowrap text-[14px] text-lng-ink">{a.message}</span>
          </span>
        );
      })}
    </>
  );
}

export function AnnounceMarquee({ announcements, hostSideMap }: AnnounceMarqueeProps) {
  const t = useT();
  if (announcements.length === 0) return null;

  return (
    <div className="group mb-1 w-full overflow-hidden py-[10px]" aria-label={t('loungeV2.announce.badge')}>
      <div className="inline-flex flex-nowrap whitespace-nowrap pl-[100%] animate-lng-marquee will-change-transform group-hover:[animation-play-state:paused]">
        <MarqueeRow announcements={announcements} hostSideMap={hostSideMap} />
        <MarqueeRow announcements={announcements} hostSideMap={hostSideMap} />
      </div>
    </div>
  );
}
