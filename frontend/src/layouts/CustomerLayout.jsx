import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navLinks = [
  { to: '/customer', label: 'Home', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { to: '/customer/products', label: 'Products', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  )},
  { to: '/customer/order', label: 'Order', icon: (a) => (
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 -mt-5 ${a ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    </div>
  )},
  { to: '/customer/orders', label: 'My Orders', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  )},
  { to: '/customer/profile', label: 'Profile', icon: (a) => (
    <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  )},
];

export default function CustomerLayout({ children }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-20">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0" style={{ zIndex: 9998 }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || 'Customer'}</p>
              <p className="text-[10px] text-gray-400 leading-tight">Customer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-end h-16 px-2">
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            const isCenter = to === '/customer/order';
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-end pb-2 gap-0.5 transition-colors ${isCenter ? 'pb-0' : ''} ${active && !isCenter ? 'text-emerald-600' : 'text-gray-400'}`}>
                {icon(active)}
                {!isCenter && <span className={`text-[10px] font-semibold ${active ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
