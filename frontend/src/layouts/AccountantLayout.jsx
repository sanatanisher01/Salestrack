import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AccountantLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-blue-600 text-lg">SalesTrack</span>
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/accountant" className="text-gray-600 hover:text-blue-600">Dashboard</Link>
              <Link to="/accountant/orders" className="text-gray-600 hover:text-blue-600">Orders</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
