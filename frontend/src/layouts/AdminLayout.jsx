import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/owners', label: 'Owners' },
  { to: '/admin/map', label: 'Live Map' },
  { to: '/admin/inventory', label: 'Inventory' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-white border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <img src="/jdm-logo.png" alt="JDM" className="w-8 h-8 rounded-xl object-contain" />
              <span className="font-black text-[#111827] text-base tracking-tight">JDM</span>
              <span className="text-[10px] font-bold text-white bg-[#0F172A] px-2 py-0.5 rounded-md">ADMIN</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, label }) => {
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
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button onClick={handleLogout} className="hidden sm:block text-xs text-[#6B7280] hover:text-red-500 font-medium transition-colors">Logout</button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t border-gray-100">
          {navLinks.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`flex-1 text-center py-2.5 text-[10px] font-semibold transition-colors ${active ? 'text-[#0F172A] border-b-2 border-[#0F172A]' : 'text-gray-400'}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-5">{children}</main>
    </div>
  );
}
