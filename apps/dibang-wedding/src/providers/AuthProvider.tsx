import { useEffect, useState } from 'react';
import { createAuthBootstrap } from '../lib/authBootstrap';
import { useApiAuthSync } from '../hooks/useApiAuthSync';
import type { Session } from '@supabase/supabase-js';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handle = createAuthBootstrap();
    handle.getInitialSession().then((s) => {
      setSession(s);
      setIsReady(true);
    });
    return handle.subscribe((_event, s) => {
      setSession(s);
    });
  }, []);

  // SDK 헤더 동기화는 별도 훅으로 분리 (UI/데이터 분리 P5-2).
  // session 변화 → useEffect → client.setConfig.
  useApiAuthSync(session);

  if (!isReady) return null;

  return (
    <AuthContext.Provider value={{ session, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}
