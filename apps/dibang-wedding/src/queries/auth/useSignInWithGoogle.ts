import { useMutation } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * Supabase Google OAuth 로그인 mutation 훅.
 * 성공 시 supabase가 반환하는 redirect url을 그대로 돌려준다 — 호출 페이지가
 * `window.location.href` 로 이동시키는 책임을 가진다 (라우팅·외부 nav는 UI 책임).
 */
export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async ({ redirectTo }: { redirectTo: string }) => {
      const supabase = getSupabaseClient()!;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    },
  });
}
