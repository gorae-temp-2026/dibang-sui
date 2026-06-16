import { useMutation } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * Supabase 이메일/비밀번호 로그인 mutation 훅.
 * 성공 후 navigate는 호출 페이지의 onSuccess 콜백에서 처리한다.
 * auth 헤더 주입은 AuthProvider 의 onAuthStateChange(SIGNED_IN) 가 처리한다.
 */
export function useSignInWithPassword() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });
}
