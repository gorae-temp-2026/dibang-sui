import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../providers/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { session, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (session) {
      // redirect 쿼리(내부 경로)가 있으면 그 경로로 복귀, 없으면 /my-wedding 폴백.
      const raw = new URLSearchParams(window.location.search).get('redirect');
      const isSafe =
        !!raw && raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/auth/callback';
      navigate(isSafe ? raw! : '/my-wedding', { replace: true });
      return;
    }
    // PKCE: code가 있으면 onAuthStateChange로 세션이 올 때까지 대기
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has('code');
    if (!hasCode) {
      // /login으로 보낼 때 redirect 쿼리를 보존해 사용자가 다시 로그인하면 복귀하도록 함.
      const raw = params.get('redirect');
      const isSafe =
        !!raw && raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/auth/callback';
      navigate(isSafe ? `/login?redirect=${encodeURIComponent(raw!)}` : '/login', { replace: true });
    }
  }, [isReady, session, navigate]);

  // 10초 타임아웃 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 10_000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pale-sky to-white">
      <div className="text-base text-muted">로그인 처리 중...</div>
    </div>
  );
}
