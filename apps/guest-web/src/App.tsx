import { BrowserRouter, Routes, Route } from 'react-router';
import { InvitationPage } from './pages/InvitationPage';
import { GuestFlowPage } from './pages/GuestFlowPage';
import { MobileInvitation } from './pages/prototype/MobileInvitation';
import DisplayPage from './pages/DisplayPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GuestFlowPage />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/prototype/mobile-invitation" element={<MobileInvitation />} />
        <Route path="/:slug" element={<InvitationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
