import { useNavigate } from 'react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMeOptions,
  getMeQueryKey,
  updateMarketingConsentMutation,
} from '@gorae/contracts/@tanstack/react-query.gen';
import { useAuth } from '../providers/AuthContext';
import { useZkLogin } from '../providers/ZkLoginProvider';
import { useSignOut } from '../queries/auth/useSignOut';

export function SettingsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const zk = useZkLogin();
  const signOut = useSignOut();
  const queryClient = useQueryClient();

  const meta = session?.user?.user_metadata;
  const userName = meta?.display_name ?? meta?.name ?? session?.user?.email ?? '알 수 없음';

  // 마케팅 동의 — 서버값 derived + 사용자 토글 override 패턴.
  // set-state-in-effect 회피 (React 19 룰, WeddingMemoryBookCuratePage와 동형).
  const { data: me } = useQuery(getMeOptions());
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const marketing = userOverride ?? me?.marketing_agreed ?? false;
  const [toast, setToast] = useState<string | null>(null);

  const marketingMutation = useMutation({
    ...updateMarketingConsentMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
      setToast('변경되었습니다');
      setTimeout(() => setToast(null), 2000);
    },
  });

  const handleMarketingToggle = () => {
    const newValue = !marketing;
    setUserOverride(newValue);
    marketingMutation.mutate({ body: { agreed: newValue } });
  };

  // useSignOut 훅 사용 (라운드 1 1-B). supabase 직접 호출 제거.
  // DEV 지갑 로그인은 Supabase 세션이 아니라 dev 키페어(sessionStorage) 기반이라
  // supabase signOut만으론 안 풀린다. zk.logout()으로 dev 키페어까지 정리해야
  // zk.isAuthenticated가 false가 되어 /login에서 /my-wedding으로 튕기지 않고
  // useApiAuthSync가 X-Dev-Auth 헤더도 제거한다.
  const handleLogout = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        zk.logout();
        navigate('/login');
      },
    });
  };

  return (
    <div className="px-6 py-8">
      <h1 className="text-[28px] font-semibold text-navy mb-6">설정</h1>

      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-sm text-muted mb-1">현재 로그인</p>
        <p className="text-lg font-semibold text-navy">{userName}</p>
      </div>

      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-base font-semibold text-navy mb-3">약관·동의</p>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-base text-navy">마케팅 정보 수신 동의</span>
          <input
            type="checkbox"
            checked={marketing}
            onChange={handleMarketingToggle}
            disabled={marketingMutation.isPending}
            className="h-5 w-5"
          />
        </label>
        {toast && (
          <p className="mt-3 text-sm text-green-600">{toast}</p>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-line bg-white px-5 py-3.5 text-base font-semibold text-red-500 hover:bg-red-50 transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
