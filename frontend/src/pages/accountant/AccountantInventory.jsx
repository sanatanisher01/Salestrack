import { useEffect, useState } from 'react';
import AccountantLayout from '../../layouts/AccountantLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { uploadImages } from '../../utils/uploadImages';

export default function AccountantInventory() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', unit: 'piece', stock: '' });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
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
      let images = [];
      if (imageFiles.length > 0) {
        images = await uploadImages(imageFiles, 'products');
      }
      await api.post('/products', {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        stock: form.stock ? Number(form.stock) : null,
        images,
      });
      toast.success('Product added');
      resetForm();
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
      let images = [...existingImages];
      if (imageFiles.length > 0) {
        const newUrls = await uploadImages(imageFiles, 'products');
        images = [...images, ...newUrls].slice(0, 5);
      }
      await api.patch(`/products/${editingProduct.id}`, {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        stock: form.stock ? Number(form.stock) : null,
        images,
      });
      toast.success('Product updated');
      resetForm();
      setEditingProduct(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', price: '', unit: 'piece', stock: '' });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
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
    setExistingImages(p.images || []);
    setImageFiles([]);
    setImagePreviews([]);
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    resetForm();
  };

  return (
    <AccountantLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{products.length} products</p>
        </div>
        <button onClick={() => { setShowForm(true); cancelEdit(); }} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingProduct) && (
        <div className="card mb-4 border border-blue-100">
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
                <label className="text-xs text-gray-500 mb-1 block">Stock (optional)</label>
                <input className="input" type="number" min="0" placeholder="—" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); cancelEdit(); }} className="text-sm text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
            </div>

            {/* Image upload */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="text-xs text-gray-500 mb-2 block font-semibold">Product Photos (max 5)</label>
              {/* Existing images */}
              {existingImages.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {existingImages.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExistingImage(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px]">×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* New image previews */}
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {imagePreviews.map((url, i) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-300">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleImageSelect}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:font-semibold file:text-xs hover:file:bg-blue-100" />
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="card flex items-center justify-between py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {p.images?.length > 0 ? (
                <img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">📦</div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  {!p.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactive</span>}
                </div>
                <p className="text-xs text-gray-400">
                  ₹{p.price} / {p.unit}
                  {p.stock != null && <span className="ml-2">· Stock: {p.stock}</span>}
                  {p.images?.length > 0 && <span className="ml-2">· {p.images.length} photo{p.images.length > 1 ? 's' : ''}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(p)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                Delete
              </button>
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
    </AccountantLayout>
  );
}
