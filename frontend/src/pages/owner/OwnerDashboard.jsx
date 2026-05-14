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
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <OwnerLayout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <p className="text-indigo-200 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">Hello, {user?.name}</h1>
        <p className="text-indigo-200 text-xs mt-1">
          {loading ? '...' : `${stats.onDuty} of ${stats.team} salesmen on duty`}
        </p>
        <Link to="/owner/map"
          className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all backdrop-blur-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          View Live Map
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Salesmen', value: stats.team, sub: 'team members', gradient: 'from-blue-50 to-blue-100/50', text: 'text-blue-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { label: 'On Duty Now', value: stats.onDuty, sub: 'active right now', gradient: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 12a1 1 0 100-2 1 1 0 000 2z" /></svg> },
          { label: "Today's Orders", value: stats.todayOrders, sub: `₹${stats.todayRevenue.toFixed(0)} revenue`, gradient: 'from-violet-50 to-violet-100/50', text: 'text-violet-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
          { label: 'Pending', value: stats.pending, sub: 'need action', gradient: 'from-amber-50 to-amber-100/50', text: 'text-amber-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map((c) => (
          <div key={c.label} className={`bg-gradient-to-br ${c.gradient} rounded-3xl p-4 border border-white`}>
            <span className={`inline-flex p-1.5 rounded-xl ${c.gradient} ${c.text}`}>{c.icon}</span>
            <p className={`text-3xl font-bold mt-2 ${c.text}`}>{loading ? '—' : c.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{c.label}</p>
            <p className="text-[10px] text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/owner/orders', label: 'Manage Orders', sub: `${stats.pending} pending`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, iconBg: 'bg-violet-100 text-violet-600', color: 'border-violet-100 hover:border-violet-300' },
          { to: '/owner/team', label: 'Manage Team', sub: `${stats.team} members`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, iconBg: 'bg-blue-100 text-blue-600', color: 'border-blue-100 hover:border-blue-300' },
          { to: '/owner/history', label: 'View History', sub: 'Sessions & stops', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: 'bg-gray-100 text-gray-600', color: 'border-gray-100 hover:border-gray-300' },
          { to: '/owner/map', label: 'Live Tracking', sub: `${stats.onDuty} active`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, iconBg: 'bg-emerald-100 text-emerald-600', color: 'border-emerald-100 hover:border-emerald-300' },
        ].map(({ to, label, sub, icon, iconBg, color }) => (
          <Link key={to} to={to} className={`card border ${color} transition-all hover:shadow-md group`}>
            <span className={`inline-flex p-2 rounded-xl ${iconBg}`}>{icon}</span>
            <p className="font-semibold text-sm text-gray-800 mt-2">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </Link>
        ))}
      </div>
    </OwnerLayout>
  );
}
