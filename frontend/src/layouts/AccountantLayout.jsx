import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import InstallPrompt from '../components/InstallPrompt';

const navLinks = [
  { to: '/accountant', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/accountant/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/accountant/ledger', label: 'Ledger', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/accountant/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', isCenter: true },
  { to: '/accountant/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function AccountantLayout({ children }) {
  const { user } = useAuthStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-[#111827] leading-tight">{user?.name}</p>
              <p className="text-[10px] text-[#6B7280]">Accountant</p>
            </div>
          </div>
          <InstallPrompt />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-5">{children}</main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex items-end h-16 px-4">
          {navLinks.map(({ to, label, icon, isCenter }) => {
            const active = location.pathname === to;
            if (isCenter) {
              return (
                <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-end pb-1">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center -mt-5 shadow-lg active:scale-90 transition-transform ${active ? 'bg-[#0F172A]' : 'bg-[#FF7A00]'}`} style={{ boxShadow: active ? '0 4px 14px rgba(15,23,42,0.3)' : '0 4px 14px rgba(255,122,0,0.3)' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
                  </div>
                </Link>
              );
            }
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
