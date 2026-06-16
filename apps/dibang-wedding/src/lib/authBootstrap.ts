import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export interface AuthBootstrapHandle {
  getInitialSession: () => Promise<Session | null>;
  subscribe: (onChange: (event: AuthChangeEvent, session: Session | null) => void) => () => void;
}

export function createAuthBootstrap(): AuthBootstrapHandle {
  const supabase = getSupabaseClient();
  return {
    getInitialSession: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    subscribe: (onChange) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(onChange);
      return () => subscription.unsubscribe();
    },
  };
}
