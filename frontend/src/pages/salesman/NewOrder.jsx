import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesmanLayout from '../../layouts/SalesmanLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'order_queue';

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function saveToQueue(order) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push(order);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
async function flushQueue() {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!queue.length) return;
  const remaining = [];
  for (const order of queue) {
    try { await api.post('/orders', order); }
    catch (err) { if (!err.response) remaining.push(order); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
if (typeof window !== 'undefined') window.addEventListener('online', flushQueue);

function ProductSearch({ products, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) && p.isActive)
    : products.filter((p) => p.isActive);

  return (
    <div className="relative" ref={ref}>
      <input
        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors bg-white"
        placeholder="Search or type product name *"
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        required
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-50">
          {filtered.slice(0, 8).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setSearch(p.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between text-sm"
            >
              <span className="font-medium text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400">₹{p.price}/{p.unit}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerName: '', customerPhone: '', note: '' });
  const [items, setItems] = useState([{ productName: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data.products)).catch(() => {});
  }, []);

  const addItem = () => setItems([...items, { productName: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: field === 'productName' ? value : Number(value) };
    setItems(updated);
  };

  const selectProduct = (i, product) => {
    const updated = [...items];
    updated[i] = { ...updated[i], productName: product.name, unitPrice: product.price };
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || submittedId) return;
    setLoading(true);

    const localId = generateLocalId();
    setSubmittedId(localId);

    const order = { ...form, items, _localId: localId };
    try {
      if (!navigator.onLine) {
        saveToQueue(order);
        toast.success('Saved offline — will sync when online');
        navigate('/salesman/orders');
        return;
      }
      await api.post('/orders', order);
      toast.success('Order submitted!');
      navigate('/salesman/orders');
    } catch (err) {
      setSubmittedId(null);
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SalesmanLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-[#111827]">New Order</h1>
        <p className="text-sm text-[#6B7280]">Fill in the details below</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Customer
          </h2>
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" placeholder="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" placeholder="Phone (optional)" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Items
            </h2>
            <button type="button" onClick={addItem} className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Item
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
                )}
              </div>
              <ProductSearch
                products={products}
                value={item.productName}
                onChange={(val) => updateItem(i, 'productName', val)}
                onSelect={(p) => selectProduct(i, p)}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                  <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors bg-white" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Unit Price (₹)</label>
                  <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors bg-white" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} required />
                </div>
              </div>
              <p className="text-xs text-right text-gray-500">Subtotal: <span className="font-semibold text-gray-700">₹{(item.quantity * item.unitPrice).toFixed(2)}</span></p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-blue-600">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Note
          </h2>
          <textarea className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors resize-none" placeholder="Optional note..." rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <button type="submit" disabled={loading || !!submittedId} className="bg-[#0F172A] text-white font-bold rounded-xl active:scale-95 transition-transform w-full py-3.5 text-base">
          {loading ? 'Submitting...' : 'Submit Order'}
        </button>
      </form>
    </SalesmanLayout>
  );
}
