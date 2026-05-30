import { useEffect, useState } from 'react';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function OwnerInventory() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', unit: 'piece', stock: '' });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => api.get('/products').then(({ data }) => setProducts(data.products)).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/products', {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        stock: form.stock ? Number(form.stock) : null,
      });
      toast.success('Product added');
      setForm({ name: '', price: '', unit: 'piece', stock: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/products/${editingProduct.id}`, {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        stock: form.stock ? Number(form.stock) : null,
      });
      toast.success('Product updated');
      setEditingProduct(null);
      setForm({ name: '', price: '', unit: 'piece', stock: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setForm({ name: p.name, price: String(p.price), unit: p.unit || 'piece', stock: p.stock != null ? String(p.stock) : '' });
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({ name: '', price: '', unit: 'piece', stock: '' });
  };

  return (
    <OwnerLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{products.length} products</p>
        </div>
        <button onClick={() => { setShowForm(true); cancelEdit(); }} className="btn-primary gap-1">
          <span className="text-lg leading-none">+</span> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingProduct) && (
        <div className="card mb-4 border border-indigo-100">
          <h2 className="font-semibold text-gray-800 mb-3">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={editingProduct ? handleUpdate : handleCreate} className="space-y-3">
            <input className="input" placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Price (₹)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="piece">Piece</option>
                  <option value="kg">Kg</option>
                  <option value="liter">Liter</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Stock</label>
                <input className="input" type="number" min="0" placeholder="—" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); cancelEdit(); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="card flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                {!p.isActive && <span className="badge text-xs bg-red-100 text-red-600">Inactive</span>}
              </div>
              <p className="text-xs text-gray-400">
                ₹{p.price} / {p.unit}
                {p.stock != null && <span className="ml-2">· Stock: {p.stock}</span>}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(p)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Edit</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-sm text-gray-400">Click "Add Product" to get started</p>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
