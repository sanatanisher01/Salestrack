import { useEffect, useState } from 'react';
import AccountantLayout from '../../layouts/AccountantLayout';
import api from '../../api/axios';

export default function AccountantDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, value: 0 });

  useEffect(() => {
    api.get('/orders').then(({ data }) => {
      const orders = data.orders;
      setStats({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        value: orders.reduce((s, o) => s + (o.totalValue || 0), 0),
      });
    });
  }, []);

  return (
    <AccountantLayout>
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-500 mt-1">Total Orders</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-gray-500 mt-1">Pending</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
          <p className="text-sm text-gray-500 mt-1">Delivered</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">₹{stats.value.toFixed(0)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Value</p>
        </div>
      </div>
    </AccountantLayout>
  );
}
