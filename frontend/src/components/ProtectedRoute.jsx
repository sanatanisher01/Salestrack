import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    // Redirect to appropriate login page
    if (role === 'customer') return <Navigate to="/customer/login" replace />;
    return <Navigate to="/" replace />;
  }
  if (role && user.role !== role) {
    if (role === 'customer') return <Navigate to="/customer/login" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}
