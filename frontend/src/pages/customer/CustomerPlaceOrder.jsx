import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerPlaceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState(location.state?.cart || {});
  const [products, setProducts] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const [locating, setLocating] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
    api.get('/customer/me').then(({ data }) => {
      setCustomer(data);
      if (data.shopLocation) setAddress(data.shopLocation);
    }).catch(() => {});
  }, []);

  const cartItems = Object.values(cart).filter((i) => i.qty > 0);
  const total = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const addToCart = (p) => setCart((c) => ({ ...c, [p.id]: { ...p, qty: (c[p.id]?.qty || 0) + 1 } }));
  const removeFromCart = (p) => setCart((c) => {
    const qty = (c[p.id]?.qty || 0) - 1;
    if (qty <= 0) { const n = { ...c }; delete n[p.id]; return n; }
    return { ...c, [p.id]: { ...p, qty } };
  });

  const confirmLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let addr = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'JDM/1.0' } });
          if (res.ok) { const d = await res.json(); addr = d.display_name || ''; }
        } catch {}
        setAddress({ lat: coords.latitude, lng: coords.longitude, address: addr });
        setLocating(false);
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleOrder = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    if (!address) { toast.error('Please confirm delivery address'); return; }
    setLoading(true);
    try {
      const items = cartItems.map((i) => ({ productName: i.name, quantity: i.qty, unitPrice: i.price }));
      await api.post('/customer/orders', { items, deliveryAddress: address, note });
      toast.success('Order placed!');
      navigate('/customer/orders');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">My Cart</h1>
          <span className="text-sm text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Cart items */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">🛒</p>
              <p className="font-semibold text-gray-700">Your cart is empty</p>
              <button onClick={() => navigate('/customer')} className="mt-3 text-[#0C831F] font-semibold text-sm">Browse Products</button>
            </div>
          ) : (
            <div>
              {cartItems.map((item) => {
                const p = products.find((x) => x.id === item.id) || item;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#0C831F] rounded-xl px-1.5 py-0.5 flex-shrink-0">
                      <button onClick={() => removeFromCart(p)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-lg">−</button>
                      <span className="text-white text-sm font-bold w-4 text-center">{item.qty}</span>
                      <button onClick={() => addToCart(p)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-lg">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[#0C831F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <p className="font-bold text-sm text-gray-900">Delivery Address</p>
          </div>
          {address ? (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-700 leading-relaxed">{address.address || `${address.lat?.toFixed(4)}, ${address.lng?.toFixed(4)}`}</p>
              <button onClick={confirmLocation} className="text-[#0C831F] text-xs font-semibold mt-1.5">Change location</button>
            </div>
          ) : (
            <button onClick={confirmLocation} disabled={locating}
              className="w-full py-3 border-2 border-dashed border-[#0C831F] rounded-xl text-[#0C831F] text-sm font-semibold disabled:opacity-50">
              {locating ? 'Getting location...' : '📍 Use current location'}
            </button>
          )}
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="font-bold text-sm text-gray-900 mb-2">Add note (optional)</p>
          <textarea className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none resize-none border border-gray-100 focus:border-[#0C831F]" rows={2} placeholder="Any special instructions..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {/* Bill summary */}
        {cartItems.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-sm text-gray-900 mb-3">Bill Summary</p>
            <div className="space-y-2">
              {cartItems.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.name} × {i.qty}</span>
                  <span className="font-medium">₹{(i.qty * i.price).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Place order button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-50">
          <div className="max-w-2xl mx-auto">
            <button onClick={handleOrder} disabled={loading || !address}
              className="w-full bg-[#0C831F] text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50 active:scale-[0.98] transition-all">
              {loading ? 'Placing Order...' : `Place Order · ₹${total.toFixed(0)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
