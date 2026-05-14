import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSalesmanNotificationStore } from '../store/salesmanNotificationStore';
import SalesmanNotificationBell from '../components/SalesmanNotificationBell';
import InstallPrompt from '../components/InstallPrompt';

const navLinks = [
  { to: '/salesman', label: 'Home', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { to: '/salesman/map', label: 'My Map', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { to: '/salesman/new-order', label: 'New Order', icon: (a) => (
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 -mt-5 ${a ? 'bg-indigo-700' : 'bg-indigo-600'}`}>
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
    </div>
  )},
  { to: '/salesman/orders', label: 'Orders', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  )},
  { to: '/salesman/profile', label: 'Profile', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  )},
];

export default function SalesmanLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { init, cleanup } = useSalesmanNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="min-h-screen bg-[#f5f6fa] pb-20">
      {/* Top header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">Salesman</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <InstallPrompt />
            <SalesmanNotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-end h-16 px-2">
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            const isCenter = to === '/salesman/new-order';
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-end pb-2 gap-0.5 transition-colors ${isCenter ? 'pb-0' : ''} ${active && !isCenter ? 'text-indigo-600' : 'text-gray-400'}`}>
                {icon(active)}
                {!isCenter && <span className={`text-[10px] font-semibold ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
