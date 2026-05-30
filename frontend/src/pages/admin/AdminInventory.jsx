import { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../api/axios';

export default function AdminInventory() {
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/owners').then(({ data }) => setOwners(data.owners)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedOwner) { setProducts([]); return; }
    api.get(`/admin/inventory/${selectedOwner}`).then(({ data }) => setProducts(data.products)).catch(() => setProducts([]));
  }, [selectedOwner]);

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <AdminLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Inventory (All Owners)</h1>
        <p className="text-sm text-gray-500">View products for any owner</p>
      </div>

      <div className="card mb-4 space-y-3">
        <select className="input" value={selectedOwner} onChange={(e) => setSelectedOwner(e.target.value)}>
          <option value="">Select an Owner</option>
          {owners.map((o) => <option key={o.uid} value={o.uid}>{o.name} ({o.email})</option>)}
        </select>
        {selectedOwner && (
          <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
      </div>

      {selectedOwner && (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="card flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                <p className="text-xs text-gray-400">₹{p.price} / {p.unit}{p.stock != null ? ` · Stock: ${p.stock}` : ''}</p>
              </div>
              <span className={`badge text-xs ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-center py-8">No products found</p>}
        </div>
      )}

      {!selectedOwner && (
        <p className="text-gray-400 text-center py-12">Select an owner to view their inventory</p>
      )}
    </AdminLayout>
  );
}
