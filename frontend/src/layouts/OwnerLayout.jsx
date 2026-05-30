import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import NotificationBell from '../components/NotificationBell';

// Bottom tab bar items (only 3)
const bottomTabs = [
  { to: '/owner', label: 'Dashboard', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { to: '/owner/map', label: 'Live Map', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
  )},
  { to: '/owner/orders', label: 'Orders', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  )},
];

// Sidebar menu items (all pages)
const menuLinks = [
  { to: '/owner', label: 'Dashboard', icon: '🏠' },
  { to: '/owner/map', label: 'Live Map', icon: '🗺️' },
  { to: '/owner/orders', label: 'Orders', icon: '📋' },
  { to: '/owner/team', label: 'Team', icon: '👥' },
  { to: '/owner/history', label: 'History', icon: '🕐' },
  { to: '/owner/inventory', label: 'Inventory', icon: '📦' },
  { to: '/owner/customers', label: 'Customers', icon: '🏪' },
  { to: '/owner/ledger', label: 'Ledger', icon: '💰' },
  { to: '/owner/profile', label: 'Profile', icon: '👤' },
];

// All nav links for desktop
const allNavLinks = [
  { to: '/owner', label: 'Dashboard' },
  { to: '/owner/map', label: 'Map' },
  { to: '/owner/orders', label: 'Orders' },
  { to: '/owner/team', label: 'Team' },
  { to: '/owner/history', label: 'History' },
  { to: '/owner/inventory', label: 'Inventory' },
  { to: '/owner/customers', label: 'Customers' },
  { to: '/owner/ledger', label: 'Ledger' },
  { to: '/owner/profile', label: 'Profile' },
];

export default function OwnerLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { init, cleanup } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  usePushNotifications();

  useEffect(() => {
    if (user?.uid) init(user.uid);
    return cleanup;
  }, [user?.uid]);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    cleanup();
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-20 sm:pb-0">
      {/* Top header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Hamburger menu button (mobile) */}
            <button onClick={() => setMenuOpen(true)} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/jdm-logo.png" alt="JDM" className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 text-base tracking-tight">JDM</span>
            </div>
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {allNavLinks.map(({ to, label }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/owner/profile" className="flex items-center gap-2 pl-2 border-l border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm hover:opacity-80 transition-opacity">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 bg-black/40 z-[9999]" onClick={() => setMenuOpen(false)} />
          <div className="sm:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[10000] shadow-2xl flex flex-col">
            {/* Menu header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <img src="/jdm-logo.png" alt="JDM" className="w-9 h-9 rounded-xl object-contain" />
                <div>
                  <p className="font-bold text-gray-900">JDM</p>
                  <p className="text-[10px] text-gray-400">Jai Durga Maa</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Menu links */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {menuLinks.map(({ to, label, icon }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-1 transition-all ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span className="text-lg">{icon}</span>
                    <span className={`font-medium text-sm ${active ? 'text-indigo-700' : 'text-gray-700'}`}>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Menu footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400">Owner</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      <main className="max-w-6xl mx-auto px-4 py-5">{children}</main>

      {/* Mobile bottom tab bar (only 3 tabs) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="flex items-end h-16 px-4">
          {bottomTabs.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-end pb-2 gap-0.5 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                {icon(active)}
                <span className={`text-[10px] font-semibold ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
