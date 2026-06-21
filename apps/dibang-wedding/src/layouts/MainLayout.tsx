import { Outlet, NavLink } from 'react-router';
import { useT } from '../lib/i18n';

// 하단 네비 4탭 — Inyeon · Event list · My event · Setting (디방 통합 목업 260620 SSOT).
// 2026-06-20 통합: 기존 3탭(나의 결혼식·참여한 결혼식·설정)에 Inyeon(유니버스) 신규 추가.
// QR·DM 탭은 nav에서 제외(핸드오프 §2-1) — /qr·/dm 라우트 자체는 App.tsx에 유지, DM은 Inyeon으로 흡수.
// 라벨 = i18n(ko 인연/이벤트 리스트/나의 이벤트/설정 · en Inyeon/Event list/My event/Setting).

function InyeonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const navLinkClass = (isActive: boolean) =>
  `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${isActive ? 'text-navy' : 'text-gray-400'}`;

export function MainLayout() {
  const t = useT();
  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto">
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-50">
        <div className="max-w-lg mx-auto relative">
          <div className="bg-white border-t border-line pt-2.5 pb-5">
            <div className="grid grid-cols-4">
              <NavLink to="/inyeon" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <InyeonIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>{t('nav.inyeon')}</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/wedding-list" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <GridIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>{t('nav.eventList')}</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/my-wedding" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <HeartIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>{t('nav.myEvent')}</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/settings" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <SettingsIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>{t('nav.setting')}</span>
                  </>
                )}
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
