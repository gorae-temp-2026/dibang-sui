import { useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';

// 일반화된 Supabase Realtime 채널 구독 훅.
// queries/* 레이어가 supabase 클라이언트를 직접 import 하지 않도록
// 인프라(채널 생성·구독·해제)를 이곳에 집약한다.
//
// 사용처는 channelName / event 메타데이터 / onChange 콜백만 넘기고
// Realtime 구현 디테일(supabase client, channel lifecycle)은 모른다.
export function useRealtimeChannel(
  channelName: string,
  event: {
    schema: string;
    table: string;
    filter?: string;
  },
  onChange: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', ...event },
        () => {
          onChange();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // event/onChange 의 안정성은 호출처가 보장한다(useCallback/상수).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled]);
}
