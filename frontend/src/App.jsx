import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOwners from './pages/admin/AdminOwners';
import AdminMap from './pages/admin/AdminMap';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerMap from './pages/owner/OwnerMap';
import OwnerOrders from './pages/owner/OwnerOrders';
import OwnerTeam from './pages/owner/OwnerTeam';
import OwnerHistory from './pages/owner/OwnerHistory';
import OwnerProfile from './pages/owner/OwnerProfile';
import SalesmanDashboard from './pages/salesman/SalesmanDashboard';
import SalesmanMap from './pages/salesman/SalesmanMap';
import SalesmanOrders from './pages/salesman/SalesmanOrders';
import NewOrder from './pages/salesman/NewOrder';
import SalesmanProfile from './pages/salesman/SalesmanProfile';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import AccountantOrders from './pages/accountant/AccountantOrders';

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <LoginPage />;
  const routes = { admin: '/admin', owner: '/owner', salesman: '/salesman', accountant: '/accountant' };
  return <Navigate to={routes[user.role] || '/'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/owners" element={<ProtectedRoute role="admin"><AdminOwners /></ProtectedRoute>} />
        <Route path="/admin/map" element={<ProtectedRoute role="admin"><AdminMap /></ProtectedRoute>} />

        <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/owner/map" element={<ProtectedRoute role="owner"><OwnerMap /></ProtectedRoute>} />
        <Route path="/owner/orders" element={<ProtectedRoute role="owner"><OwnerOrders /></ProtectedRoute>} />
        <Route path="/owner/team" element={<ProtectedRoute role="owner"><OwnerTeam /></ProtectedRoute>} />
        <Route path="/owner/history" element={<ProtectedRoute role="owner"><OwnerHistory /></ProtectedRoute>} />
        <Route path="/owner/profile" element={<ProtectedRoute role="owner"><OwnerProfile /></ProtectedRoute>} />

        <Route path="/salesman" element={<ProtectedRoute role="salesman"><SalesmanDashboard /></ProtectedRoute>} />
        <Route path="/salesman/map" element={<ProtectedRoute role="salesman"><SalesmanMap /></ProtectedRoute>} />
        <Route path="/salesman/orders" element={<ProtectedRoute role="salesman"><SalesmanOrders /></ProtectedRoute>} />
        <Route path="/salesman/new-order" element={<ProtectedRoute role="salesman"><NewOrder /></ProtectedRoute>} />
        <Route path="/salesman/profile" element={<ProtectedRoute role="salesman"><SalesmanProfile /></ProtectedRoute>} />

        <Route path="/accountant" element={<ProtectedRoute role="accountant"><AccountantDashboard /></ProtectedRoute>} />
        <Route path="/accountant/orders" element={<ProtectedRoute role="accountant"><AccountantOrders /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
