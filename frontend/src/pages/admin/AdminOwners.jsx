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
    await api.patch(`/admin/owners/${uid}/${isActive ? 'deactivate' : 'activate'}`);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Owners</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Owner</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-3">
          <h2 className="font-semibold">New Owner</h2>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {owners.map((o) => (
          <div key={o.uid} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-gray-500">{o.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {o.isActive ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => toggle(o.uid, o.isActive)} className={o.isActive ? 'btn-danger text-sm px-3 py-1' : 'btn-success text-sm px-3 py-1'}>
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
