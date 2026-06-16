import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

// react-refresh/only-export-components 충돌 회피: 컴포넌트(.tsx) 파일은 컴포넌트만 export,
// context·hook은 별도 .ts 파일로 분리. Fast Refresh 호환성 확보.

export interface AuthContextValue {
  session: Session | null;
  isReady: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  isReady: false,
});

export function useAuth() {
  return useContext(AuthContext);
}
