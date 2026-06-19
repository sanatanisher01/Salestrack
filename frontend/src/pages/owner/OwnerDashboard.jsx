import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerLayout from '../../layouts/OwnerLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ team: 0, onDuty: 0, orders: 0, pending: 0, todayOrders: 0, todayRevenue: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/owner/team'), api.get('/orders')]).then(([t, o]) => {
      const team = t.data.team;
      const orders = o.data.orders;
      const today = orders.filter((o) => {
        const d = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) : new Date(o.createdAt);
        return d.toDateString() === new Date().toDateString();
      });
      setStats({
        team: team.filter((m) => m.role === 'salesman').length,
        onDuty: team.filter((m) => m.dutyStatus === 'on').length,
        orders: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        todayOrders: today.length,
        todayRevenue: today.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0),
        totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <OwnerLayout>
      {/* Welcome */}
      <div className="bg-[#0F172A] rounded-2xl p-6 mb-5">
        <p className="text-white/60 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-black mt-0.5">{user?.name}</h1>
        <p className="text-white/50 text-xs mt-1">{loading ? '...' : `${stats.onDuty} of ${stats.team} salesmen on duty`}</p>
        <Link to="/owner/map" className="mt-4 inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          View Live Map
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Salesmen', value: stats.team, sub: 'team members', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
          { label: 'On Duty', value: stats.onDuty, sub: 'active now', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
          { label: "Today's Orders", value: stats.todayOrders, sub: `₹${stats.todayRevenue.toFixed(0)} revenue`, color: 'bg-orange-50 text-orange-700', border: 'border-orange-100' },
          { label: 'Pending', value: stats.pending, sub: 'need action', color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl p-4 border ${c.border} shadow-sm`}>
            <div className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.color} mb-2`}>{c.label}</div>
            <p className="text-3xl font-black text-[#111827]">{loading ? '—' : c.value}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/owner/orders', label: 'Manage Orders', sub: `${stats.pending} pending`, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-blue-600 bg-blue-50' },
          { to: '/owner/team', label: 'Manage Team', sub: `${stats.team} members`, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-violet-600 bg-violet-50' },
          { to: '/owner/history', label: 'View History', sub: 'Sessions & stops', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-gray-600 bg-gray-100' },
          { to: '/owner/map', label: 'Live Tracking', sub: `${stats.onDuty} active`, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ to, label, sub, icon, color }) => (
          <Link key={to} to={to} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97]">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-3`}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
            </div>
            <p className="font-semibold text-sm text-[#111827]">{label}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>
    </OwnerLayout>
  );
}
