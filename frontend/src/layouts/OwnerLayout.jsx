import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import NotificationBell from '../components/NotificationBell';

const navLinks = [
  { to: '/owner', label: 'Dashboard', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { to: '/owner/map', label: 'Live Map', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )},
  { to: '/owner/orders', label: 'Orders', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { to: '/owner/team', label: 'Team', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { to: '/owner/history', label: 'History', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { to: '/owner/profile', label: 'Profile', icon: (active) => (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
];

export default function OwnerLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { init, cleanup } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  usePushNotifications();

  useEffect(() => {
    if (user?.uid) init(user.uid);
    return cleanup;
  }, [user?.uid]);

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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-base tracking-tight">SalesTrack</span>
            </div>
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, label, icon }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <span className="w-4 h-4">{icon(active)}</span>{label}
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

      <main className="max-w-6xl mx-auto px-4 py-5">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="flex items-end h-16 px-2">
          {navLinks.map(({ to, label, icon }) => {
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
