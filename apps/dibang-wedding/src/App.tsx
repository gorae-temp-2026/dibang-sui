import { Routes, Route, Navigate, useLocation } from 'react-router'
import { useAuth } from './providers/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { MyWeddingPage } from './pages/MyWeddingPage'
import { WeddingListPage } from './pages/WeddingListPage'
import { QrPage } from './pages/QrPage'
import { DmPage } from './pages/DmPage'
import { SettingsPage } from './pages/SettingsPage'
import { InvitationCreatePage } from './pages/InvitationCreatePage'
import { InvitationEditPage } from './pages/InvitationEditPage'
import { LoungeFeedPage } from './pages/LoungeFeedPage'
import { LoungeV2Page } from './pages/LoungeV2Page'
import { LoungeCheckInGatePage } from './pages/LoungeCheckInGatePage'
import { HostInviteAcceptPage } from './pages/HostInviteAcceptPage'
import { LedgerPage } from './pages/LedgerPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { SharePhotoUploadPage } from './pages/SharePhotoUploadPage'
import { WeddingMemoryBookPage } from './pages/WeddingMemoryBookPage'
import { WeddingMemoryBookCuratePage } from './pages/WeddingMemoryBookCuratePage'
import { OnboardingConsentPage } from './pages/OnboardingConsentPage'
import { OnboardingGate } from './components/OnboardingGate'

const AUTH_PATHS = ['/login', '/auth/callback'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  if (session) return <>{children}</>;

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
        <Route path="/my-wedding" element={<MyWeddingPage />} />
        <Route path="/wedding-list" element={<WeddingListPage />} />
        <Route path="/qr" element={<QrPage />} />
        <Route path="/dm" element={<DmPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/invitation/create" element={<AuthGuard><OnboardingGate><InvitationCreatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/invitation/edit/:weddingId" element={<AuthGuard><OnboardingGate><InvitationEditPage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/enter" element={<AuthGuard><OnboardingGate><LoungeCheckInGatePage /></OnboardingGate></AuthGuard>} />
      <Route path="/lounge/:loungeId/v2" element={<AuthGuard><OnboardingGate><LoungeV2Page /></OnboardingGate></AuthGuard>} />
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
