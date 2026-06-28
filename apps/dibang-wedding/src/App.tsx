import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router'
import { useAuth } from './providers/AuthContext'
import { useZkLogin } from './providers/ZkLoginProvider'
import { MainLayout } from './layouts/MainLayout'
import { DevErrorBoundary } from './components/DevErrorBoundary'
import { OnboardingGate } from './components/OnboardingGate'
import { isDevBypass } from './dev/devBypass'

// 핵심 라우트 — static import (초기 로드)
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { MyWeddingPage } from './pages/MyWeddingPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

// 무거운 라우트 — lazy import (코드 스플릿)
const InyeonPage = lazy(() => import('./pages/InyeonPage').then(m => ({ default: m.InyeonPage })))
const WeddingListPage = lazy(() => import('./pages/WeddingListPage').then(m => ({ default: m.WeddingListPage })))
const QrPage = lazy(() => import('./pages/QrPage').then(m => ({ default: m.QrPage })))
const DmPage = lazy(() => import('./pages/DmPage').then(m => ({ default: m.DmPage })))
const InvitationCreatePage = lazy(() => import('./pages/InvitationCreatePage').then(m => ({ default: m.InvitationCreatePage })))
const InvitationEditPage = lazy(() => import('./pages/InvitationEditPage').then(m => ({ default: m.InvitationEditPage })))
const LoungeV2Page = lazy(() => import('./pages/LoungeV2Page').then(m => ({ default: m.LoungeV2Page })))
const MoiGatherPage = lazy(() => import('./pages/MoiGatherPage').then(m => ({ default: m.MoiGatherPage })))
const LoungeCheckInGatePage = lazy(() => import('./pages/LoungeCheckInGatePage').then(m => ({ default: m.LoungeCheckInGatePage })))
const HostInviteAcceptPage = lazy(() => import('./pages/HostInviteAcceptPage').then(m => ({ default: m.HostInviteAcceptPage })))
const LedgerPage = lazy(() => import('./pages/LedgerPage').then(m => ({ default: m.LedgerPage })))
const SharePhotoUploadPage = lazy(() => import('./pages/SharePhotoUploadPage').then(m => ({ default: m.SharePhotoUploadPage })))
const WeddingMemoryBookPage = lazy(() => import('./pages/WeddingMemoryBookPage').then(m => ({ default: m.WeddingMemoryBookPage })))
const WeddingMemoryBookCuratePage = lazy(() => import('./pages/WeddingMemoryBookCuratePage').then(m => ({ default: m.WeddingMemoryBookCuratePage })))
const OnboardingConsentPage = lazy(() => import('./pages/OnboardingConsentPage').then(m => ({ default: m.OnboardingConsentPage })))
const SignalGuidePage = lazy(() => import('./pages/SignalGuidePage').then(m => ({ default: m.SignalGuidePage })))
const MoiCreditGuidePage = lazy(() => import('./pages/MoiCreditGuidePage').then(m => ({ default: m.MoiCreditGuidePage })))
const TrustGraphPage = lazy(() => import('./pages/TrustGraphPage').then(m => ({ default: m.TrustGraphPage })))
const DevLogsPage = lazy(() => import('./pages/DevLogsPage').then(m => ({ default: m.DevLogsPage })))

const AUTH_PATHS = ['/login', '/auth/callback'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { isAuthenticated } = useZkLogin();
  const location = useLocation();

  if (isDevBypass()) return <>{children}</>; // DEV 전용 우회(프로덕션 제거)
  // zkLogin/dev 세션도 인증으로 인정(zkLogin이 Supabase 로그인 대체 — VISION §3).
  if (session || isAuthenticated) return <>{children}</>;

  const currentPath = location.pathname + location.search;
  const redirectPath = AUTH_PATHS.includes(location.pathname) ? '/my-wedding' : currentPath;
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />;
}

function App() {
  return (
    <DevErrorBoundary>
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><p className="text-gray-400">로딩 중...</p></div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/trust-graph" element={<TrustGraphPage />} />
      <Route path="/dev/logs" element={<DevLogsPage />} />
      <Route path="/onboarding/consent" element={<AuthGuard><OnboardingConsentPage /></AuthGuard>} />
      <Route element={<AuthGuard><OnboardingGate><MainLayout /></OnboardingGate></AuthGuard>}>
        <Route path="/inyeon" element={<InyeonPage />} />
        <Route path="/my-wedding" element={<MyWeddingPage />} />
        <Route path="/wedding-list" element={<WeddingListPage />} />
        <Route path="/qr" element={<QrPage />} />
        <Route path="/dm" element={<DmPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      {/* [비활성] NetworkPage(dev 스캐폴드) 주석처리: <Route path="/network" element={<AuthGuard><OnboardingGate><NetworkPage /></OnboardingGate></AuthGuard>} /> */}
      <Route path="/guide/signal" element={<AuthGuard><OnboardingGate><SignalGuidePage /></OnboardingGate></AuthGuard>} />
      <Route path="/guide/moi-credit" element={<AuthGuard><OnboardingGate><MoiCreditGuidePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invitation/create" element={<AuthGuard><OnboardingGate><InvitationCreatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invitation/edit/:weddingId" element={<AuthGuard><OnboardingGate><InvitationEditPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/enter" element={<AuthGuard><OnboardingGate><LoungeCheckInGatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/v2" element={<AuthGuard><OnboardingGate><LoungeV2Page /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/moi-gather" element={<AuthGuard><OnboardingGate><MoiGatherPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/share-photos/upload" element={<AuthGuard><OnboardingGate><SharePhotoUploadPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId" element={<AuthGuard><OnboardingGate><LoungeV2Page /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/report" element={<AuthGuard><OnboardingGate><LedgerPage /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/memory-book" element={<AuthGuard><OnboardingGate><WeddingMemoryBookPage /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/memory-book/curate" element={<AuthGuard><OnboardingGate><WeddingMemoryBookCuratePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invite/:token" element={<HostInviteAcceptPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </DevErrorBoundary>
  )
}

export default App
