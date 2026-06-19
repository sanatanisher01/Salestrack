import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/customerCartStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerPlaceOrder() {
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const { getCartItems, getCartTotal, addItem, removeItem, clearCart } = useCartStore();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(locationState?.selectedAddress || null);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const cartItems = getCartItems();
  const total = getCartTotal();

  useEffect(() => {
    if (!address) {
      // Check saved addresses first
      const saved = localStorage.getItem('jdm-saved-addresses');
      if (saved) {
        try { const addrs = JSON.parse(saved); if (addrs.length > 0) { setAddress(addrs[0]); return; } } catch {}
      }
      // Fallback to shop location
      api.get('/customer/me').then(({ data }) => {
        if (data.shopLocation) setAddress(data.shopLocation);
      }).catch(() => {});
    }
  }, []);

  const handleOrder = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    if (!address) { toast.error('Please confirm delivery address'); return; }
    setLoading(true);
    try {
      const items = cartItems.map((i) => ({ productName: i.name, quantity: i.qty, unitPrice: i.price }));
      await api.post('/customer/orders', { items, deliveryAddress: address, note, paymentMethod });
      toast.success('Order placed successfully!');
      clearCart();
      navigate('/customer/orders');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-28">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-900">My Cart</h1>
            <p className="text-[10px] text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Cart items */}
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl text-center py-16 shadow-sm">
            <p className="text-5xl mb-3">🛒</p>
            <p className="font-bold text-gray-700 text-lg">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add items to get started</p>
            <button onClick={() => navigate('/customer')} className="mt-4 bg-[#6C63FF] text-white font-bold px-6 py-3 rounded-xl text-sm active:scale-95">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <p className="text-xs font-bold text-[#6C63FF]">🕐 Delivery in 10 minutes</p>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center bg-[#6C63FF] rounded-lg overflow-hidden">
                      <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center text-white font-bold">−</button>
                      <span className="text-white text-xs font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={() => addItem(item)} className="w-7 h-7 flex items-center justify-center text-white font-bold">+</button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 w-14 text-right">₹{(item.qty * item.price).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-sm text-gray-900 mb-2">Delivery to</p>
              {address ? (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#6C63FF] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  <div className="flex-1">
                    {address.flat && <p className="text-sm font-semibold text-gray-900">{address.flat}</p>}
                    <p className="text-xs text-gray-500 leading-relaxed">{address.full || address.address || `${address.lat?.toFixed(4)}, ${address.lng?.toFixed(4)}`}</p>
                    <button onClick={() => navigate('/customer/address', { state: { returnTo: '/customer/order' } })} className="text-[#6C63FF] text-xs font-bold mt-1.5">Change Address</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => navigate('/customer/address', { state: { returnTo: '/customer/order' } })}
                  className="w-full py-3 border-2 border-dashed border-[#6C63FF] rounded-xl text-[#6C63FF] text-sm font-semibold">
                  📍 Add delivery address
                </button>
              )}
            </div>

            {/* Note */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-sm text-gray-900 mb-2">Delivery instructions</p>
              <textarea className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none resize-none border border-gray-100 focus:border-[#6C63FF]" rows={2} placeholder="Any special instructions..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-sm text-gray-900 mb-3">Payment Method</p>
              <div className="space-y-2">
                {[
                  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive', icon: '💵' },
                  { id: 'pay_later', label: 'Pay Later', desc: 'Added to your account balance', icon: '📒' },
                  { id: 'upi', label: 'UPI', desc: 'GPay, PhonePe, Paytm', icon: '📱' },
                ].map((method) => (
                  <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${paymentMethod === method.id ? 'bg-[#6C63FF]/5 border-2 border-[#6C63FF]' : 'bg-gray-50 border-2 border-transparent'}`}>
                    <span className="text-2xl">{method.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${paymentMethod === method.id ? 'text-[#6C63FF]' : 'text-gray-800'}`}>{method.label}</p>
                      <p className="text-[10px] text-gray-400">{method.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.id ? 'border-[#6C63FF]' : 'border-gray-300'}`}>
                      {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />}
                    </div>
                  </button>
                ))}
              </div>
              {paymentMethod === 'upi' && (
                <div className="mt-3 bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                  <p className="text-xs text-yellow-800">💡 UPI payment link will be sent after order confirmation by the seller.</p>
                </div>
              )}
            </div>

            {/* Bill */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-sm text-gray-900 mb-3">Bill Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Item total</span><span className="font-medium">₹{total.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery fee</span><span className="font-medium text-[#6C63FF]">FREE</span></div>
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Grand Total</span><span>₹{total.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Place order bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-black text-gray-900">₹{total.toFixed(0)}</p>
            </div>
            <button onClick={handleOrder} disabled={loading || !address}
              className="bg-[#6C63FF] text-white font-bold py-3.5 px-8 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all">
              {loading ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
