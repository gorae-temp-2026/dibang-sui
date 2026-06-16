import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { client } from '@gorae/contracts/client.gen';

/**
 * Supabase 세션의 access_token 을 contracts SDK 클라이언트의 Authorization 헤더로 동기화.
 *
 * AuthProvider 의 책임을 분해 (UI/데이터 분리 P5-2):
 *   - AuthProvider: Supabase 세션 state 관리 (getSession + onAuthStateChange)
 *   - useApiAuthSync: SDK 헤더 갱신 (이 훅)
 *
 * session.access_token 이 변할 때마다 setConfig 호출. null 이면 헤더 제거.
 */
export function useApiAuthSync(session: Session | null): void {
  useEffect(() => {
    if (session?.access_token) {
      client.setConfig({ headers: { Authorization: `Bearer ${session.access_token}` } });
    } else {
      client.setConfig({ headers: {} });
    }
  }, [session?.access_token]);
}
