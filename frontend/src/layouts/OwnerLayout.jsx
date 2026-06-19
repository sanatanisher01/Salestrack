import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import NotificationBell from '../components/NotificationBell';

const bottomTabs = [
  { to: '/owner', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/owner/map', label: 'Live Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/owner/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

const menuLinks = [
  { to: '/owner', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/owner/map', label: 'Live Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/owner/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/owner/team', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/owner/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/owner/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { to: '/owner/customers', label: 'Customers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/owner/ledger', label: 'Ledger', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/owner/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

const allNavLinks = [
  { to: '/owner', label: 'Home' },
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

  useEffect(() => { if (user?.uid) init(user.uid); return cleanup; }, [user?.uid]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => { cleanup(); await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 sm:pb-0" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setMenuOpen(true)} className="sm:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
              <svg className="w-5 h-5 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-2.5">
              <img src="/jdm-logo.png" alt="JDM" className="w-8 h-8 rounded-xl object-contain" />
              <span className="font-black text-[#111827] text-base tracking-tight hidden sm:block">JDM</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {allNavLinks.map(({ to, label }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${active ? 'bg-[#0F172A] text-white' : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100'}`}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link to="/owner/profile" className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform">
              {user?.name?.[0]?.toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 bg-black/50 z-[9999]" onClick={() => setMenuOpen(false)} />
          <div className="sm:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[10000] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <img src="/jdm-logo.png" alt="JDM" className="w-9 h-9 rounded-xl object-contain" />
                <div>
                  <p className="font-black text-[#111827] text-sm">JDM</p>
                  <p className="text-[10px] text-[#6B7280]">Jai Durga Maa</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {menuLinks.map(({ to, label, icon }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-0.5 transition-all active:scale-[0.97] ${active ? 'bg-[#0F172A] text-white' : 'text-[#6B7280] hover:bg-gray-50'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={icon} /></svg>
                    <span className={`font-medium text-sm ${active ? 'text-white' : 'text-[#111827]'}`}>{label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-white font-bold">{user?.name?.[0]?.toUpperCase()}</div>
                <div>
                  <p className="font-bold text-sm text-[#111827]">{user?.name}</p>
                  <p className="text-xs text-[#6B7280]">Owner</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-medium active:scale-[0.97]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      <main className="max-w-6xl mx-auto px-5 py-5">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
        <div className="flex items-end h-16 px-6">
          {bottomTabs.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-end pb-2.5 gap-1 transition-colors active:scale-90 ${active ? 'text-[#0F172A]' : 'text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={icon} /></svg>
                <span className={`text-[10px] font-semibold ${active ? 'text-[#0F172A]' : 'text-gray-400'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
