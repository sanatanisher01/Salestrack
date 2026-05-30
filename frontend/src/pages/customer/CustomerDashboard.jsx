import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ orders: 0, pending: 0, delivered: 0, products: 0, balance: 0, totalPaid: 0 });
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/customer/me').catch(() => ({ data: null })),
      api.get('/customer/orders').catch(() => ({ data: { orders: [] } })),
      api.get('/customer/products').catch(() => ({ data: { products: [] } })),
      api.get('/payments/me').catch(() => ({ data: { balance: 0, totalPaid: 0 } })),
    ]).then(([me, orders, products, payments]) => {
      setCustomer(me.data);
      const o = orders.data.orders;
      setStats({
        orders: o.length,
        pending: o.filter((x) => x.status === 'pending' || x.status === 'confirmed').length,
        delivered: o.filter((x) => x.status === 'delivered').length,
        products: products.data.products.length,
        balance: payments.data.balance || 0,
        totalPaid: payments.data.totalPaid || 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <CustomerLayout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-5 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-emerald-200 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">{customer?.shopName || user?.name}</h1>
        <p className="text-emerald-200 text-xs mt-1">
          {loading ? '...' : `${stats.pending} orders in progress`}
        </p>
        {!customer?.linkedOwnerId && (
          <Link to="/customer/profile" className="mt-3 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
            ⚠️ Link to a supplier
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'My Orders', value: stats.orders, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          { label: 'In Progress', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Delivered', value: stats.delivered, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map((s) => (
          <div key={s.label} className="card text-center p-3">
            <span className={`inline-flex p-1.5 rounded-xl ${s.bg} ${s.color} mx-auto`}>{s.icon}</span>
            <p className={`text-xl font-bold ${s.color} mt-1`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Payment balance */}
      {stats.balance > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-3xl p-4 border border-red-100 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Pending Balance</p>
              <p className="text-2xl font-bold text-red-600 mt-1">₹{stats.balance.toFixed(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Paid</p>
              <p className="text-sm font-semibold text-emerald-600">₹{stats.totalPaid.toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/customer/order" className="card border border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-emerald-100 text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">Place Order</p>
          <p className="text-xs text-gray-400">{stats.products} products available</p>
        </Link>
        <Link to="/customer/orders" className="card border border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-indigo-100 text-indigo-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">Track Orders</p>
          <p className="text-xs text-gray-400">{stats.pending} in progress</p>
        </Link>
      </div>
    </CustomerLayout>
  );
}
