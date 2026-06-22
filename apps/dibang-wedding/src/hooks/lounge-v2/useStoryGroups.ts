import { useMemo } from 'react';
import type { FeedItem } from '../../types/db-compat';
import { buildStoryGroups } from '../../lib/loungeV2Feed';
import type { StoryGroup } from '../../types/lounge-v2';

// 피드를 작성자별 스토리 그룹으로(최근 활동순). 순수 파생값이라 hooks/.
export function useStoryGroups(items: FeedItem[]): StoryGroup[] {
  return useMemo(() => buildStoryGroups(items), [items]);
}
