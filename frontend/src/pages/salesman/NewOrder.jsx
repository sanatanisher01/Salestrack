import { useState } from 'react';
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
    try {
      await api.post('/orders', order);
    } catch (err) {
      // Only keep in queue if it's a network error, not a validation error
      if (!err.response) {
        remaining.push(order);
      }
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
}

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerName: '', customerPhone: '', note: '' });
  const [items, setItems] = useState([{ productName: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState(null); // Prevent double-submit

  const addItem = () => setItems([...items, { productName: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: field === 'productName' ? value : Number(value) };
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || submittedId) return; // Prevent double-submit
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
      setSubmittedId(null); // Allow retry on error
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SalesmanLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        <p className="text-sm text-gray-500">Fill in the details below</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Customer
          </h2>
          <input className="input" placeholder="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className="input" placeholder="Phone (optional)" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </div>

        {/* Items */}
        <div className="card space-y-3">
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
              <input className="input bg-white" placeholder="Product Name *" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} required />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                  <input className="input bg-white" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Unit Price (₹)</label>
                  <input className="input bg-white" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} required />
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
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Note
          </h2>
          <textarea className="input resize-none" placeholder="Optional note..." rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <button type="submit" disabled={loading || !!submittedId} className="btn-primary w-full py-3.5 text-base">
          {loading ? 'Submitting...' : 'Submit Order'}
        </button>
      </form>
    </SalesmanLayout>
  );
}
