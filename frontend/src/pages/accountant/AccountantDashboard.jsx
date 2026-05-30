import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountantLayout from '../../layouts/AccountantLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';

export default function AccountantDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, todayOrders: 0, todayRevenue: 0, totalRevenue: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/products')]).then(([o, p]) => {
      const orders = o.data.orders;
      const today = orders.filter((ord) => {
        const d = ord.createdAt?._seconds ? new Date(ord.createdAt._seconds * 1000) : new Date(ord.createdAt);
        return d.toDateString() === new Date().toDateString();
      });
      setStats({
        total: orders.length,
        pending: orders.filter((ord) => ord.status === 'pending').length,
        delivered: orders.filter((ord) => ord.status === 'delivered').length,
        todayOrders: today.length,
        todayRevenue: today.filter(ord => ord.status !== 'cancelled').reduce((s, ord) => s + (ord.totalValue || 0), 0),
        totalRevenue: orders.filter(ord => ord.status !== 'cancelled').reduce((s, ord) => s + (ord.totalValue || 0), 0),
        products: p.data.products.length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AccountantLayout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-600 via-violet-700 to-purple-700 rounded-3xl p-5 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <p className="text-violet-200 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">{user?.name}</h1>
        <p className="text-violet-200 text-xs mt-1">
          {loading ? '...' : `${stats.todayOrders} orders today · ₹${stats.todayRevenue.toFixed(0)} revenue`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Today's Orders", value: stats.todayOrders, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          { label: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(0)}`, color: 'text-violet-600', bg: 'bg-violet-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Products', value: stats.products, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        ].map((s) => (
          <div key={s.label} className="card text-center p-3">
            <span className={`inline-flex p-1.5 rounded-xl ${s.bg} ${s.color} mx-auto`}>{s.icon}</span>
            <p className={`text-xl font-bold ${s.color} mt-1`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{loading ? '—' : stats.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Pending Orders</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{loading ? '—' : stats.pending}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/accountant/orders" className="card border border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-indigo-100 text-indigo-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">View Orders</p>
          <p className="text-xs text-gray-400">{stats.total} total</p>
        </Link>
        <Link to="/accountant/inventory" className="card border border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-emerald-100 text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">Manage Inventory</p>
          <p className="text-xs text-gray-400">{stats.products} products</p>
        </Link>
      </div>
    </AccountantLayout>
  );
}
