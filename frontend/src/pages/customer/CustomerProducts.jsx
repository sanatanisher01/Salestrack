// Products are now shown directly on CustomerDashboard
// This page redirects to dashboard
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerProducts() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/customer', { replace: true }); }, []);
  return null;
}
