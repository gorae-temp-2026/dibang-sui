import { Outlet, NavLink } from 'react-router';

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

function QrIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <path d="M14 14h2v2h-2zM20 14h2v2h-2zM14 20h2v2h-2zM20 20h2v2h-2zM17 17h2v2h-2z" />
    </svg>
  );
}

// TEMP: ChatIcon 제거 — DM 탭 숨김 (issue #28), DM 기능 완성 시 git history에서 복구

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
  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto">
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-50">
        <div className="max-w-lg mx-auto relative">
          <div className="bg-white border-t border-line pt-2.5 pb-5">
            {/* TEMP: DM 탭(#28)·QR 탭(2026-05-29 QA) 숨김으로 현재 가시 탭 3개 → grid-cols-3.
                DM 기능 완성 + QR 노출 시 grid-cols-5로 복구 (issue #47) */}
            <div className="grid grid-cols-3">
              <NavLink to="/my-wedding" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <HeartIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>나의 결혼식</span>
                  </>
                )}
              </NavLink>

              <NavLink to="/wedding-list" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <GridIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>참여한 결혼식</span>
                  </>
                )}
              </NavLink>

              {/* QA 2026-05-29: 축의 QR 탭 일단 숨김(없애는 건 아니고 추후 앱 출시 시 노출). */}
              {false && (
              <NavLink to="/qr" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-navy text-white' : 'bg-sky/20 text-sky'}`}>
                      <QrIcon className={isActive ? 'text-white' : 'text-sky'} />
                    </div>
                    <span>QR</span>
                  </>
                )}
              </NavLink>
              )}

              {/* TEMP: DM NavLink 제거 — issue #28, DM 기능 완성 시 git history에서 복구 (라우트 /dm 자체는 유지) */}

              <NavLink to="/settings" className={({ isActive }) => navLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <SettingsIcon className={isActive ? 'text-navy' : 'text-gray-400'} />
                    <span>설정</span>
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
