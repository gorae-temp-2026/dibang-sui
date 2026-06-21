import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { authCallbackMachine } from '../machines/authCallback.machine';
import { useZkLogin } from '../providers/ZkLoginProvider';

function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/auth/callback'
    ? raw : null;
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const zk = useZkLogin();
  const zkAttempted = useRef(false);
  const [state, send] = useMachine(authCallbackMachine);

  // zkLogin implicit flow: Google OAuth 콜백 → URL 프래그먼트 #id_token → salt/proof → Sui 지갑 세션 완성.
  useEffect(() => {
    if (zkAttempted.current) return;
    const hash = window.location.hash;
    if (!hash.includes('id_token')) {
      send({ type: 'NO_SESSION' });
      navigate('/login', { replace: true });
      return;
    }
    zkAttempted.current = true;
    zk.completeLoginFromUrl().then((ok) => {
      if (ok) {
        send({ type: 'RESOLVE' });
        const stored = sessionStorage.getItem('dibang.login.redirect');
        sessionStorage.removeItem('dibang.login.redirect');
        const dest = safeRedirect(stored) ?? safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
        navigate(dest ?? '/my-wedding', { replace: true });
      } else {
        send({ type: 'NO_SESSION' });
        navigate('/login', { replace: true });
      }
    }).catch((e) => {
      console.error('[zkLogin] 콜백 처리 실패:', e);
      send({ type: 'NO_SESSION' });
      navigate('/login', { replace: true });
    });
  }, [zk, send, navigate]);

  // 10초 타임아웃 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      send({ type: 'TIMEOUT' });
      navigate('/login', { replace: true });
    }, 10_000);
    return () => clearTimeout(timer);
  }, [navigate, send]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pale-sky to-white">
      <div className="text-base text-muted">
        {state.matches('timedOut') ? '시간이 초과되어 로그인으로 이동합니다...' : '로그인 처리 중...'}
      </div>
    </div>
  );
}
