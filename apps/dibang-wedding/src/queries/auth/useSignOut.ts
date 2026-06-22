import { useMutation } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * Supabase 로그아웃 mutation 훅.
 * 성공 후 navigate는 호출 페이지의 onSuccess 콜백에서 처리한다.
 */
export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient()!;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
