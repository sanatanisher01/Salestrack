import { useEffect, useState } from 'react';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function OwnerTeam() {
  const [team, setTeam] = useState([]);
  const [tab, setTab] = useState('salesman');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/owner/team').then(({ data }) => setTeam(data.team));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(tab === 'salesman' ? '/owner/team/salesman' : '/owner/team/accountant', form);
      toast.success(`${tab === 'salesman' ? 'Salesman' : 'Accountant'} created`);
      setForm({ name: '', email: '', phone: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (uid, isActive) => {
    await api.patch(`/owner/team/${uid}/${isActive ? 'deactivate' : 'activate'}`);
    load();
  };

  const filtered = team.filter((m) => m.role === tab);

  return (
    <OwnerLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">{team.length} members total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-1">
          <span className="text-lg leading-none">+</span> Add Member
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['salesman', 'accountant'].map((r) => (
          <button key={r} onClick={() => setTab(r)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === r ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {r.charAt(0).toUpperCase() + r.slice(1)}s ({team.filter(m => m.role === r).length})
          </button>
        ))}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg">New {tab === 'salesman' ? 'Salesman' : 'Accountant'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <input className="input" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {tab === 'salesman' && (
                <input className="input" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              )}
              <input className="input" type="password" placeholder="Password *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.uid} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
              {m.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                {m.role === 'salesman' && (
                  <span className={`badge text-xs ${m.dutyStatus === 'on' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.dutyStatus === 'on' ? 'On Duty' : 'Off Duty'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{m.email}</p>
              {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`badge text-xs ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {m.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => toggle(m.uid, m.isActive)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${m.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
              >
                {m.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-gray-500 font-medium">No {tab}s yet</p>
            <p className="text-sm text-gray-400">Click "Add Member" to get started</p>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
