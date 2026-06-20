import { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminOwners() {
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/owners').then(({ data }) => setOwners(data.owners));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/owners', form);
      toast.success('Owner created');
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (uid, isActive) => {
    try {
      await api.patch(`/admin/owners/${uid}/${isActive ? 'deactivate' : 'activate'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Owners</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#0F172A] text-white font-bold rounded-xl active:scale-95 transition-transform">+ Add Owner</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-3">
          <h2 className="font-semibold">New Owner</h2>
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="bg-[#0F172A] text-white font-bold rounded-xl active:scale-95 transition-transform">{loading ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-[#111827] font-semibold rounded-xl">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {owners.map((o) => (
          <div key={o.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-[#6B7280]">{o.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {o.isActive ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => toggle(o.uid, o.isActive)} className={o.isActive ? 'bg-red-600 text-white font-bold rounded-xl text-sm px-3 py-1' : 'bg-emerald-600 text-white font-bold rounded-xl text-sm px-3 py-1'}>
                {o.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        {owners.length === 0 && <p className="text-gray-500 text-center py-8">No owners yet</p>}
      </div>
    </AdminLayout>
  );
}
