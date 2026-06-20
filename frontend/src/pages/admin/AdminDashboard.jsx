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
      setStats({ owners: owners.length, active: owners.filter((o) => o.isActive).length, salesmen: liveRes.data.live.length, onDuty: liveRes.data.live.length });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AdminLayout>
      <div className="bg-[#0F172A] rounded-2xl p-6 mb-5">
        <p className="text-white/60 text-sm font-medium">{greeting},</p>
        <h1 className="text-white text-2xl font-black mt-0.5">{user?.name}</h1>
        <p className="text-white/50 text-xs mt-1">{loading ? '...' : `${stats.onDuty} salesmen active right now`}</p>
        <Link to="/admin/map" className="mt-4 inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          View Live Map
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Owners', value: stats.owners, border: 'border-blue-100' },
          { label: 'Active Owners', value: stats.active, border: 'border-emerald-100' },
          { label: 'Live Salesmen', value: stats.onDuty, border: 'border-violet-100' },
          { label: 'Inactive', value: stats.owners - stats.active, border: 'border-red-100' },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl p-4 border ${c.border} shadow-sm`}>
            <p className="text-3xl font-black text-[#111827]">{loading ? '—' : c.value}</p>
            <p className="text-[11px] text-[#6B7280] font-medium mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/owners" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="font-semibold text-sm text-[#111827]">Manage Owners</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{stats.owners} total</p>
        </Link>
        <Link to="/admin/map" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
          <p className="font-semibold text-sm text-[#111827]">Live Map</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{stats.onDuty} active</p>
        </Link>
      </div>
    </AdminLayout>
  );
}
