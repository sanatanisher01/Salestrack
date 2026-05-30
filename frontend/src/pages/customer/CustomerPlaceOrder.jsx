import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerPlaceOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmAddress, setConfirmAddress] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
  }, []);

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  const addToCart = (product) => {
    const existing = cart.find((c) => c.productName === product.name);
    if (existing) {
      setCart(cart.map((c) => c.productName === product.name ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { productName: product.name, unitPrice: product.price, quantity: 1 }]);
    }
    toast.success(`${product.name} added`);
  };

  const updateQty = (i, qty) => {
    if (qty <= 0) { setCart(cart.filter((_, idx) => idx !== i)); return; }
    const updated = [...cart];
    updated[i] = { ...updated[i], quantity: qty };
    setCart(updated);
  };

  const removeFromCart = (i) => setCart(cart.filter((_, idx) => idx !== i));
  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const confirmLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'JDM/1.0' } });
          const data = await res.json();
          address = data.display_name || '';
        } catch {}
        setConfirmAddress({ lat: coords.latitude, lng: coords.longitude, address });
        setLocating(false);
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Add items to cart first'); return; }
    if (!confirmAddress) { toast.error('Please confirm delivery address'); return; }
    setLoading(true);
    try {
      await api.post('/customer/orders', { items: cart, deliveryAddress: confirmAddress, note });
      toast.success('Order placed!');
      navigate('/customer/orders');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Place Order</h1>
        <p className="text-sm text-gray-500">Select products and confirm delivery</p>
      </div>

      {/* Product search */}
      <input className="input mb-3" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {filtered.slice(0, 12).map((p) => (
          <button key={p.id} onClick={() => addToCart(p)}
            className="card text-left p-3 hover:border-emerald-200 hover:shadow-md transition-all active:scale-[0.98] border border-transparent">
            <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
            <p className="text-xs text-gray-400">{p.unit}</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">₹{p.price}</p>
          </button>
        ))}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="card mb-4 border border-emerald-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Cart ({cart.length} items)</p>
          <div className="space-y-2">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">₹{item.unitPrice} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(i, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-bold">−</button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(i, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">+</button>
                  <button onClick={() => removeFromCart(i)} className="ml-1 text-red-400 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-emerald-600">₹{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Delivery address confirmation */}
      <div className="card mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Delivery Address</p>
        {confirmAddress ? (
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-emerald-800">{confirmAddress.address || `${confirmAddress.lat.toFixed(5)}, ${confirmAddress.lng.toFixed(5)}`}</p>
            <button onClick={confirmLocation} className="text-xs text-emerald-600 font-semibold mt-1">Update location</button>
          </div>
        ) : (
          <button onClick={confirmLocation} disabled={locating}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 font-medium hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-50">
            {locating ? 'Getting location...' : '📍 Confirm Delivery Location'}
          </button>
        )}
      </div>

      {/* Note */}
      <div className="card mb-4">
        <textarea className="input resize-none" placeholder="Order note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading || cart.length === 0}
        className="btn-primary w-full py-3.5 text-base bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
        {loading ? 'Placing Order...' : `Place Order · ₹${total.toFixed(2)}`}
      </button>
    </CustomerLayout>
  );
}
