import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMachine } from '@xstate/react';
import { loginMachine } from '../machines/login.machine';
import { useAuth } from '../providers/AuthContext';
import { useSignInWithGoogle } from '../queries/auth/useSignInWithGoogle';
import { useSignInWithPassword } from '../queries/auth/useSignInWithPassword';
import { useZkLogin } from '../providers/ZkLoginProvider';
import { env } from '../env';
import { DibangWordmark } from '@gorae/invitation-ui';

// /login 진입 시 쿼리 `redirect` 파라미터의 안전성 검사.
// 내부 경로(`/`로 시작)만 허용하고, 프로토콜 상대 URL(`//`)·로그인/콜백 루프는 차단.
function resolveSafeRedirect(raw: string | null): string {
  const isSafe =
    !!raw && raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/auth/callback';
  return isSafe ? raw! : '/my-wedding';
}

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, isReady } = useAuth();
  const redirectAfter = resolveSafeRedirect(searchParams.get('redirect'));
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const signInGoogle = useSignInWithGoogle();
  const signInPassword = useSignInWithPassword();
  const zk = useZkLogin();
  // 로그인 진행 flow는 머신(login): idle → signingGoogle/signingPassword.
  const [state, send] = useMachine(loginMachine);
  const isDisabled = !state.matches('idle');

  // 이미 로그인된 사용자가 /login 에 진입하면 redirect 쿼리(또는 기본 /my-wedding)로 보낸다.
  // (기존엔 AuthProvider 가 라우팅 책임을 가졌으나, provider 는 상태 공급만 하도록 분리.)
  useEffect(() => {
    if (!isReady || !session) return;
    navigate(redirectAfter, { replace: true });
  }, [isReady, session, redirectAfter, navigate]);

  // DEV 지갑 로그인(zkLogin 우회)은 Supabase 세션이 아니라 dev 키페어 인증이라 위 세션
  // effect가 안 걸린다. dev 지갑 인증이 잡히면 /my-wedding 으로 이동.
  // effect로 미루는 이유: useApiAuthSync 의 X-Dev-Auth 헤더 세팅 effect가 같은 커밋에서
  // 먼저 끝난 뒤 navigate 가 반영돼야 MyWeddingPage 첫 요청이 401 나지 않는다(retry:false).
  useEffect(() => {
    if (!isReady || session || !zk.isAuthenticated) return;
    navigate('/my-wedding', { replace: true });
  }, [isReady, session, zk.isAuthenticated, navigate]);

  const siteUrl = env.VITE_SITE_URL ?? window.location.origin;
  // OAuth 콜백 URL에 redirect 쿼리를 실어 보내야 AuthCallbackPage가 복귀 경로를 알 수 있음.
  // 기본값(/my-wedding)인 경우엔 부착하지 않아 콜백 URL allowlist 매칭을 단순하게 유지.
  const redirectTo =
    redirectAfter && redirectAfter !== '/my-wedding'
      ? `${siteUrl}/auth/callback?redirect=${encodeURIComponent(redirectAfter)}`
      : `${siteUrl}/auth/callback`;

  function signInWithGoogle() {
    send({ type: 'SIGN_IN_GOOGLE' });
    signInGoogle.mutate(
      { redirectTo },
      {
        onSuccess: (data) => {
          if (data.url) window.location.href = data.url;
          else send({ type: 'SIGN_IN_DONE' });
        },
        onError: (err) => {
          send({ type: 'SIGN_IN_ERROR' });
          window.alert(err instanceof Error ? err.message : '로그인 실패');
        },
      },
    );
  }

  function signInWithEmail() {
    if (!devEmail || !devPassword) {
      window.alert('이메일과 비밀번호를 입력하세요');
      return;
    }
    send({ type: 'SIGN_IN_PASSWORD' });
    signInPassword.mutate(
      { email: devEmail, password: devPassword },
      {
        onSuccess: () => {
          // auth 헤더 주입은 AuthProvider 의 onAuthStateChange(SIGNED_IN) 가 처리한다.
          send({ type: 'SIGN_IN_DONE' });
          navigate(redirectAfter);
        },
        onError: (err) => {
          send({ type: 'SIGN_IN_ERROR' });
          window.alert(err instanceof Error ? err.message : '로그인 실패');
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pale-sky to-white px-6">
      <h1 className="mb-2"><DibangWordmark className="text-6xl" /></h1>
      <p className="text-base text-muted mb-8">로그인</p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={signInWithGoogle}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-5 py-3.5 hover:border-soft-sky hover:bg-pale-sky/30 transition-colors disabled:opacity-50 disabled:cursor-default"
        >
          <GoogleIcon />
          <span className="text-base font-medium text-navy">구글로 계속하기</span>
        </button>

        {import.meta.env.DEV && (
          <>
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-line" />
              <span className="text-sm text-muted">DEV MODE</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            <input
              type="email"
              placeholder="이메일"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              autoCapitalize="none"
              className="w-full rounded-xl border border-line bg-white px-5 py-3 text-base text-navy placeholder:text-muted/50 outline-none focus:border-soft-sky transition-colors"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={devPassword}
              onChange={(e) => setDevPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && signInWithEmail()}
              className="w-full rounded-xl border border-line bg-white px-5 py-3 text-base text-navy placeholder:text-muted/50 outline-none focus:border-soft-sky transition-colors"
            />
            <button
              onClick={signInWithEmail}
              disabled={isDisabled}
              className="w-full rounded-xl border border-line bg-white px-5 py-3 text-base text-muted hover:border-soft-sky hover:bg-pale-sky/30 transition-colors disabled:opacity-50 disabled:cursor-default"
            >
              {state.matches('signingPassword') ? '로그인 중...' : '이메일로 로그인'}
            </button>

            <button
              onClick={() => zk.devLogin()}
              className="w-full rounded-xl border border-soft-sky bg-pale-sky/40 px-5 py-3 text-base font-medium text-navy hover:bg-pale-sky/60 transition-colors"
            >
              🔑 DEV 지갑 로그인 (zkLogin 우회·온체인 테스트)
            </button>
            {zk.isAuthenticated && (
              <p className="text-xs text-navy break-all rounded-lg bg-pale-sky/30 px-3 py-2">
                지갑 주소: {zk.address}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
