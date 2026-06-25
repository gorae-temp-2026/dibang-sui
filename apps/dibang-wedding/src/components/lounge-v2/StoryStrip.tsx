import type { StoryGroup } from '../../types/lounge-v2';
import { maskGuestName } from '../../lib/guestLabel';
import { useT } from '../../lib/i18n';

// 온기 스토리 strip — 프로토타입 .onki-section/.onki-label/.story-strip/.story-item/.story-photo/.story-name 정합.
// 한 줄 가로 스크롤(아이템 calc((100vw-92px)/6.5), max64/min52). 활성(메시지/피드)=회전 링 + 스토리.
// 사진 없는 MVP라 이니셜 아바타. 비활성(입장만)=비인터랙티브(탭해도 무반응).

interface StoryStripProps {
  groups: StoryGroup[];
  onOpenStory: (authorKey: string) => void;
  hostNames: Set<string>;
}

export function StoryStrip({ groups, onOpenStory, hostNames }: StoryStripProps) {
  const t = useT();
  if (groups.length === 0) return null;

  return (
    <section className="mb-1 mt-2">
      <div className="flex items-center px-[22px] pb-1">
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-lng-ink">{t('loungeV2.story.title')}</span>
      </div>

      <div className="scrollbar-hide flex gap-[10px] overflow-x-auto px-4 pb-[10px] pt-[14px]">
        {groups.map((g) => (
          <button
            key={g.authorKey}
            type="button"
            onClick={g.hasFeed ? () => onOpenStory(g.authorKey) : undefined}
            aria-disabled={!g.hasFeed}
            className={`relative w-[calc((100vw-92px)/6.5)] min-w-[52px] max-w-[64px] shrink-0 text-center ${
              g.hasFeed ? 'cursor-pointer lng-story-dot' : 'cursor-default'
            }`}
          >
            <span
              className={`relative z-[1] flex aspect-square w-full items-center justify-center rounded-full border-2 border-white bg-lng-pink text-[15px] font-semibold text-lng-brand shadow-[0_1px_4px_rgba(0,0,0,0.10)] ${
                g.hasFeed ? 'lng-story-feed' : ''
              }`}
            >
              {g.authorName.charAt(0)}
            </span>
            <span className="mt-[6px] block truncate text-[14px] font-medium leading-[1.2] tracking-[-0.02em] text-lng-ink">
              {maskGuestName(g.authorName, hostNames)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
