import { useNavigate } from 'react-router';
import { useRef, type ChangeEvent } from 'react';
import { useMachine } from '@xstate/react';
import { settingsMachine } from '../machines/settings.machine';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from '@xstate/react';
import { ChevronRight } from 'lucide-react';
import {
  getMeOptions,
  // getMeQueryKey,
} from '@gorae/contracts/@tanstack/react-query.gen';
import { useAuth } from '../providers/AuthContext';
import { useZkLogin } from '../providers/ZkLoginProvider';
import { useSignOut } from '../queries/auth/useSignOut';
import { giftActor } from '../machines/gift.machine';
import { useT, useLangStore, type Lang } from '../lib/i18n';
import { useInyeonProfile, fileToProfileDataUrl } from '../stores/inyeonProfile';

export function SettingsPage() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const photoUrl = useInyeonProfile((s) => s.photoUrl);
  const setPhotoUrl = useInyeonProfile((s) => s.setPhotoUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const url = await fileToProfileDataUrl(f);
    setPhotoUrl(url);
    send({ type: 'SHOW_TOAST', msg: t('settings.saved') });
  };
  const { session } = useAuth();
  const zk = useZkLogin();
  const signOut = useSignOut();
  // 마케팅 동의 — 서버값 derived + 사용자 토글 override 패턴 (set-state-in-effect 회피, React 19 룰).
  const { data: me } = useQuery(getMeOptions());

  const meta = session?.user?.user_metadata;
  // 세션 우선, 없으면 getMe 폴백(dev 로그인우회 프리뷰 = 철수 fixture에서 이름 표시).
  const userName = meta?.display_name ?? meta?.name ?? session?.user?.email ?? me?.name ?? '알 수 없음';

  // 저장 진행 + 토스트(2초 자동닫힘) flow는 머신(settings).
  const [, send] = useMachine(settingsMachine);
  // 요네 잔액 = 전역 요네 지갑(giftActor — 선물·꾸미기 공유). 충전 시트로 적립.
  const yone = useSelector(giftActor, (s) => s.context.yone);

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
      <h1 className="text-[28px] font-semibold text-navy mb-6">{t('settings.title')}</h1>

      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-sm text-muted mb-1">{t('settings.currentLogin')}</p>
        <p className="text-lg font-semibold text-navy">{userName}</p>
        {zk.address && (
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(zk.address!); send({ type: 'SHOW_TOAST', msg: '주소 복사됨' }); }}
            className="mt-2 w-full rounded-lg bg-gray-50 px-3 py-2 text-left"
          >
            <p className="text-xs text-muted">Sui 지갑 주소</p>
            <p className="break-all text-xs font-mono text-navy">{zk.address}</p>
          </button>
        )}
      </div>

      {/* 디방인연 대표 사진 — 전 화면 공통(프로필·이음 신청·채팅). 업로드=축소 data URL 저장. */}
      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <p className="text-base font-semibold text-navy mb-3">{t('settings.profilePhoto')}</p>
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 flex-shrink-0 rounded-full bg-cover bg-center ring-1 ring-line"
            style={{ backgroundImage: `url(${photoUrl})` }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy hover:bg-gray-50 transition-colors"
          >
            {t('settings.changePhoto')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePickPhoto} className="hidden" />
        </div>
        <p className="mt-3 text-xs text-muted">{t('settings.profilePhotoHint')}</p>
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

      {/* SUI 지갑 — 잔액 표시 */}
      <div className="rounded-xl border border-line bg-white p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4DA2FF]/20 text-xl">💧</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">My SUI</p>
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-navy tabular-nums">{(yone / 1000).toFixed(3)}</span>
              <span className="text-sm text-muted">SUI</span>
            </p>
          </div>
        </div>
      </div>

      {/* 알아보기 */}
      <div className="rounded-xl border border-line bg-white p-2 mb-4">
        {[
          { label: t('settings.guideSignal'), to: '/guide/signal' },
          { label: t('settings.guideCredit'), to: '/guide/moi-credit' },
        ].map((g) => (
          <button
            key={g.to}
            type="button"
            onClick={() => navigate(g.to)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-base font-medium text-navy">{g.label}</span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-line bg-white px-5 py-3.5 text-base font-semibold text-red-500 hover:bg-red-50 transition-colors"
      >
        {t('settings.logout')}
      </button>
    </div>
  );
}
