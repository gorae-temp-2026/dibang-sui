import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { authCallbackMachine } from '../machines/authCallback.machine';
import { useAuth } from '../providers/AuthContext';
import { useZkLogin } from '../providers/ZkLoginProvider';

function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  return raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/auth/callback'
    ? raw : null;
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { session, isReady } = useAuth();
  const zk = useZkLogin();
  const zkAttempted = useRef(false);
  // 콜백 처리 flow는 머신(authCallback): processing → resolved/redirectingLogin/timedOut.
  const [state, send] = useMachine(authCallbackMachine);

  // zkLogin implicit flow: URL 프래그먼트에 #id_token이 있으면 세션 완성.
  useEffect(() => {
    if (zkAttempted.current) return;
    const hash = window.location.hash;
    if (!hash.includes('id_token')) return;
    zkAttempted.current = true;
    zk.completeLoginFromUrl().then((ok) => {
      if (ok) {
        send({ type: 'RESOLVE' });
        const dest = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
        navigate(dest ?? '/my-wedding', { replace: true });
      } else {
        send({ type: 'NO_SESSION' });
        navigate('/login', { replace: true });
      }
    }).catch(() => {
      send({ type: 'NO_SESSION' });
      navigate('/login', { replace: true });
    });
  }, [zk, send, navigate]);

  useEffect(() => {
    if (!isReady) return;
    if (session) {
      const dest = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      send({ type: 'RESOLVE' });
      navigate(dest ?? '/my-wedding', { replace: true });
      return;
    }
    // PKCE: code가 있으면 onAuthStateChange로 세션이 올 때까지 대기
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has('code');
    const hasIdToken = window.location.hash.includes('id_token');
    if (!hasCode && !hasIdToken) {
      const dest = safeRedirect(params.get('redirect'));
      send({ type: 'NO_SESSION' });
      navigate(dest ? `/login?redirect=${encodeURIComponent(dest)}` : '/login', { replace: true });
    }
  }, [isReady, session, navigate, send]);

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
