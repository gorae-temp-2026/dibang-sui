import { useNavigate } from 'react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@xstate/react';
import { Coins, Plus } from 'lucide-react';
import {
  getMeOptions,
  getMeQueryKey,
  updateMarketingConsentMutation,
} from '@gorae/contracts/@tanstack/react-query.gen';
import { useAuth } from '../providers/AuthContext';
import { useSignOut } from '../queries/auth/useSignOut';
import { giftActor } from '../machines/gift.machine';
import { YoneChargeSheet } from '../components/settings/YoneChargeSheet';
import { useT, useLangStore, type Lang } from '../lib/i18n';

export function SettingsPage() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const { session } = useAuth();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  // 마케팅 동의 — 서버값 derived + 사용자 토글 override 패턴 (set-state-in-effect 회피, React 19 룰).
  const { data: me } = useQuery(getMeOptions());

  const meta = session?.user?.user_metadata;
  // 세션 우선, 없으면 getMe 폴백(dev 로그인우회 프리뷰 = 철수 fixture에서 이름 표시).
  const userName = meta?.display_name ?? meta?.name ?? session?.user?.email ?? me?.name ?? '알 수 없음';
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const marketing = userOverride ?? me?.marketing_agreed ?? false;
  const [toast, setToast] = useState<string | null>(null);
  // 요네 잔액 = 전역 요네 지갑(giftActor — 선물·꾸미기 공유). 충전 시트로 적립.
  const yone = useSelector(giftActor, (s) => s.context.yone);
  const [chargeOpen, setChargeOpen] = useState(false);

  const marketingMutation = useMutation({
    ...updateMarketingConsentMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
      setToast(t('settings.saved'));
      setTimeout(() => setToast(null), 2000);
    },
  });

  const handleMarketingToggle = () => {
    const newValue = !marketing;
    setUserOverride(newValue);
    marketingMutation.mutate({ body: { agreed: newValue } });
  };

  // useSignOut 훅 사용 (라운드 1 1-B). supabase 직접 호출 제거.
  const handleLogout = () => {
    signOut.mutate(undefined, {
      onSuccess: () => navigate('/login'),
    });
  };

  return (
    <div className="px-6 py-8">
      <h1 className="text-[28px] font-semibold text-navy mb-6">{t('settings.title')}</h1>

      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-sm text-muted mb-1">{t('settings.currentLogin')}</p>
        <p className="text-lg font-semibold text-navy">{userName}</p>
      </div>

      {/* 언어 설정 — ko/en (데모 핵심 범위: 네비·인연·Setting) */}
      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-base font-semibold text-navy mb-3">{t('settings.language')}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['ko', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                lang === l ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-gray-50'
              }`}
            >
              {l === 'ko' ? '한국어' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* 요네 지갑 — 잔액 + Sui 충전 진입 */}
      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8C57A]/20 text-xl">🐚</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t('settings.myYone')}</p>
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-navy tabular-nums">{yone.toLocaleString()}</span>
              <span className="text-sm text-muted">{t('settings.yoneUnit')}</span>
            </p>
          </div>
          <button
            onClick={() => setChargeOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> {t('settings.charge')}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Coins className="h-3.5 w-3.5 text-[#E8A865]" /> {t('settings.chargeHint')}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-base font-semibold text-navy mb-3">{t('settings.terms')}</p>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-base text-navy">{t('settings.marketing')}</span>
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
        {t('settings.logout')}
      </button>

      <YoneChargeSheet open={chargeOpen} onOpenChange={setChargeOpen} />
    </div>
  );
}
