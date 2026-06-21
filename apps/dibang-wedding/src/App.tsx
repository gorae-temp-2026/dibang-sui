import { Routes, Route, Navigate, useLocation } from 'react-router'
import { useAuth } from './providers/AuthContext'
import { useZkLogin } from './providers/ZkLoginProvider'
import { MainLayout } from './layouts/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { MyWeddingPage } from './pages/MyWeddingPage'
import { WeddingListPage } from './pages/WeddingListPage'
import { InyeonPage } from './pages/InyeonPage'
import { QrPage } from './pages/QrPage'
import { DmPage } from './pages/DmPage'
import { SettingsPage } from './pages/SettingsPage'
import { InvitationCreatePage } from './pages/InvitationCreatePage'
import { InvitationEditPage } from './pages/InvitationEditPage'
import { LoungeFeedPage } from './pages/LoungeFeedPage'
import { LoungeV2Page } from './pages/LoungeV2Page'
import { MoiGatherPage } from './pages/MoiGatherPage'
import { LoungeCheckInGatePage } from './pages/LoungeCheckInGatePage'
import { HostInviteAcceptPage } from './pages/HostInviteAcceptPage'
import { LedgerPage } from './pages/LedgerPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { SharePhotoUploadPage } from './pages/SharePhotoUploadPage'
import { WeddingMemoryBookPage } from './pages/WeddingMemoryBookPage'
import { WeddingMemoryBookCuratePage } from './pages/WeddingMemoryBookCuratePage'
import { OnboardingConsentPage } from './pages/OnboardingConsentPage'
import { NetworkPage } from './pages/NetworkPage'
import { SignalGuidePage } from './pages/SignalGuidePage'
import { MoiCreditGuidePage } from './pages/MoiCreditGuidePage'
import { OnboardingGate } from './components/OnboardingGate'
import { isDevBypass } from './dev/devBypass' // DEV 전용 로그인 우회(프로덕션 import.meta.env.DEV=false로 제거)

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
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/onboarding/consent" element={<AuthGuard><OnboardingConsentPage /></AuthGuard>} />
      <Route element={<AuthGuard><OnboardingGate><MainLayout /></OnboardingGate></AuthGuard>}>
        <Route path="/inyeon" element={<InyeonPage />} />
        <Route path="/my-wedding" element={<MyWeddingPage />} />
        <Route path="/wedding-list" element={<WeddingListPage />} />
        <Route path="/qr" element={<QrPage />} />
        <Route path="/dm" element={<DmPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/network" element={<AuthGuard><OnboardingGate><NetworkPage /></OnboardingGate></AuthGuard>} />
      <Route path="/guide/signal" element={<AuthGuard><OnboardingGate><SignalGuidePage /></OnboardingGate></AuthGuard>} />
      <Route path="/guide/moi-credit" element={<AuthGuard><OnboardingGate><MoiCreditGuidePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invitation/create" element={<AuthGuard><OnboardingGate><InvitationCreatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invitation/edit/:weddingId" element={<AuthGuard><OnboardingGate><InvitationEditPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/enter" element={<AuthGuard><OnboardingGate><LoungeCheckInGatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/v2" element={<AuthGuard><OnboardingGate><LoungeV2Page /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/moi-gather" element={<AuthGuard><OnboardingGate><MoiGatherPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/share-photos/upload" element={<AuthGuard><OnboardingGate><SharePhotoUploadPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId" element={<AuthGuard><OnboardingGate><LoungeFeedPage /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/report" element={<AuthGuard><OnboardingGate><LedgerPage /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/memory-book" element={<AuthGuard><OnboardingGate><WeddingMemoryBookPage /></OnboardingGate></AuthGuard>} />
      <Route path="/wedding/:weddingId/memory-book/curate" element={<AuthGuard><OnboardingGate><WeddingMemoryBookCuratePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invite/:token" element={<HostInviteAcceptPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
