import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ owners: 0, active: 0, salesmen: 0, onDuty: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/owners'), api.get('/admin/live')]).then(([ownersRes, liveRes]) => {
      const owners = ownersRes.data.owners;
      setStats({
        owners: owners.length,
        active: owners.filter((o) => o.isActive).length,
        salesmen: liveRes.data.live.length,
        onDuty: liveRes.data.live.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AdminLayout>
      <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-indigo-200 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">{user?.name}</h1>
        <p className="text-indigo-200 text-xs mt-1">{loading ? '...' : `${stats.onDuty} salesmen active right now`}</p>
        <Link to="/admin/map"
          className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all backdrop-blur-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          View Live Map
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Owners', value: stats.owners, sub: 'registered', gradient: 'from-blue-50 to-blue-100/50', text: 'text-blue-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
          { label: 'Active Owners', value: stats.active, sub: 'enabled', gradient: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Live Salesmen', value: stats.onDuty, sub: 'on duty now', gradient: 'from-violet-50 to-violet-100/50', text: 'text-violet-600', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { label: 'Inactive Owners', value: stats.owners - stats.active, sub: 'disabled', gradient: 'from-red-50 to-red-100/50', text: 'text-red-500', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
        ].map((c) => (
          <div key={c.label} className={`bg-gradient-to-br ${c.gradient} rounded-3xl p-4 border border-white`}>
            <span className={`inline-flex p-1.5 rounded-xl ${c.gradient} ${c.text}`}>{c.icon}</span>
            <p className={`text-3xl font-bold mt-2 ${c.text}`}>{loading ? '—' : c.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{c.label}</p>
            <p className="text-[10px] text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/owners" className="card border border-blue-100 hover:border-blue-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-blue-100 text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">Manage Owners</p>
          <p className="text-xs text-gray-400">{stats.owners} total</p>
        </Link>
        <Link to="/admin/map" className="card border border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-md">
          <span className="inline-flex p-2 rounded-xl bg-emerald-100 text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </span>
          <p className="font-semibold text-sm text-gray-800 mt-2">Live Map</p>
          <p className="text-xs text-gray-400">{stats.onDuty} active now</p>
        </Link>
      </div>
    </AdminLayout>
  );
}
