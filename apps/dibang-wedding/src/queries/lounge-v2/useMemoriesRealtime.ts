import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  listMemoriesQueryKey,
  listFeedInfiniteQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';
import { useRealtimeChannel } from '../../hooks/infra/useRealtimeChannel';

// 라운지 V2 Memory Realtime 구독.
// _scenario/memory-domain-split/SCENARIOS.md S-06·S-08:
// 누군가 Memory를 게시·삭제하면 다른 참여자의 "온기" 그리드와 활동 로그가
// 즉시 갱신되어야 한다.
//
// supabase_realtime publication에 v3_memories가 등록됐고(20260522120100_v3_memories_rls.sql),
// RLS는 authenticated SELECT만 — anon은 구독해도 아무 row 못 받음.
// INSERT/UPDATE/DELETE 이벤트에서 Memory 캐시 + 라운지 피드 캐시를 invalidate.
//
// supabase 클라이언트 직접 import 는 hooks/infra/useRealtimeChannel 로 위임.
export function useMemoriesRealtime(loungeId: string) {
  const queryClient = useQueryClient();

  const onChange = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: listMemoriesQueryKey({ path: { loungeId } }),
    });
    queryClient.invalidateQueries({
      queryKey: listFeedInfiniteQueryKey({ path: { loungeId } }),
    });
  }, [queryClient, loungeId]);

  useRealtimeChannel(
    `lounge-v2:memories:${loungeId}`,
    {
      schema: 'public',
      table: 'v3_memories',
      filter: `lounge_id=eq.${loungeId}`,
    },
    onChange,
    Boolean(loungeId),
  );
}
