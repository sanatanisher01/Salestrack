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
    Promise.all([api.get('/orders'), api.get('/products'), api.get('/customer/owner/orders').catch(() => ({ data: { orders: [] } }))]).then(([o, p, co]) => {
      const allOrders = [...(o.data.orders || []), ...(co.data.orders || [])];
      const today = allOrders.filter((ord) => {
        const d = ord.createdAt?._seconds ? new Date(ord.createdAt._seconds * 1000) : new Date(ord.createdAt);
        return d.toDateString() === new Date().toDateString();
      });
      setStats({
        total: allOrders.length,
        pending: allOrders.filter((ord) => ord.status === 'pending').length,
        delivered: allOrders.filter((ord) => ord.status === 'delivered').length,
        todayOrders: today.length,
        todayRevenue: today.filter(ord => ord.status !== 'cancelled').reduce((s, ord) => s + (ord.totalValue || 0), 0),
        totalRevenue: allOrders.filter(ord => ord.status !== 'cancelled').reduce((s, ord) => s + (ord.totalValue || 0), 0),
        products: p.data.products.length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AccountantLayout>
      {/* Welcome */}
      <div className="bg-[#0F172A] rounded-2xl p-6 mb-5">
        <p className="text-white/60 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-black mt-0.5">{user?.name}</h1>
        <p className="text-white/50 text-xs mt-1">{loading ? '...' : `${stats.todayOrders} orders today · ₹${stats.todayRevenue.toFixed(0)} revenue`}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Today's Orders", value: stats.todayOrders, color: 'text-blue-600' },
          { label: "Revenue", value: `₹${stats.todayRevenue.toFixed(0)}`, color: 'text-emerald-600' },
          { label: 'Products', value: stats.products, color: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-sm">
            <p className={`text-xl font-black ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-black text-[#111827] mt-1">₹{loading ? '—' : stats.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black text-[#111827] mt-1">{loading ? '—' : stats.pending}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/accountant/orders" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="font-semibold text-sm text-[#111827]">View Orders</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{stats.total} total</p>
        </Link>
        <Link to="/accountant/inventory" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <p className="font-semibold text-sm text-[#111827]">Inventory</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{stats.products} products</p>
        </Link>
      </div>
    </AccountantLayout>
  );
}
