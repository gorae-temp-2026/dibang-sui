import { BrowserRouter, Routes, Route } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InvitationPage } from './pages/InvitationPage';
import { GuestFlowPage } from './pages/GuestFlowPage';
import { MobileInvitation } from './pages/prototype/MobileInvitation';
import DisplayPage from './pages/DisplayPage';

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GuestFlowPage />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/prototype/mobile-invitation" element={<MobileInvitation />} />
        <Route path="/:slug" element={<InvitationPage />} />
        <Route path="*" element={<div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', color: '#999' }}>페이지를 찾을 수 없습니다</div>} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
