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
      const saved = localStorage.getItem('jdm-saved-addresses');
      if (saved) { try { const a = JSON.parse(saved); if (a.length) { setAddress(a[0]); return; } } catch {} }
      api.get('/customer/me').then(({ data }) => { if (data.shopLocation) setAddress(data.shopLocation); }).catch(() => {});
    }
  }, []);

  const placeOrder = async (paymentId = null) => {
    setLoading(true);
    try {
      const items = cartItems.map((i) => ({ productName: i.name, quantity: i.qty, unitPrice: i.price }));
      await api.post('/customer/orders', { items, deliveryAddress: address, note, paymentMethod, ...(paymentId && { razorpayPaymentId: paymentId }) });
      toast.success('Order placed!');
      clearCart();
      navigate('/customer/orders');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/razorpay/create-order', { amount: total });
      const options = {
        key: data.key, amount: data.amount, currency: data.currency, order_id: data.id,
        name: 'JDM - Jai Durga Maa', description: `Order - ${cartItems.length} items`,
        handler: async (res) => {
          try {
            await api.post('/razorpay/verify', { razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature, amount: total });
            await placeOrder(res.razorpay_payment_id);
          } catch { toast.error('Payment verification failed'); setLoading(false); }
        },
        theme: { color: '#0F172A' },
        modal: { ondismiss: () => { setLoading(false); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setLoading(false); toast.error('Payment failed'); });
      rzp.open();
    } catch { toast.error('Could not initiate payment'); setLoading(false); }
  };

  const handleOrder = () => {
    if (!cartItems.length) { toast.error('Cart is empty'); return; }
    if (!address) { toast.error('Add delivery address'); return; }
    if (paymentMethod === 'online') handleRazorpayPayment();
    else placeOrder();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="font-bold text-[#111827] text-base">Checkout</h1>
            <p className="text-[10px] text-[#6B7280]">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-5 space-y-4">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl text-center py-16 shadow-sm border border-gray-100">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="font-bold text-[#111827] text-lg">Cart is empty</p>
            <p className="text-sm text-[#6B7280] mt-1">Add products to get started</p>
            <button onClick={() => navigate('/customer')} className="mt-5 bg-[#0F172A] text-white font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-transform">Browse Products</button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-emerald-50/50">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Estimated delivery in 30 minutes
                </p>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                    {item.images?.length > 0 ? <img src={item.images[0]} className="w-full h-full object-cover rounded-xl" /> : <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#111827] truncate">{item.name}</p>
                    <p className="text-xs text-[#6B7280]">{item.unit} · ₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center border-2 border-[#FF7A00] rounded-lg overflow-hidden">
                      <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center text-[#FF7A00] font-bold active:bg-orange-50">−</button>
                      <span className="text-[#111827] text-xs font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={() => addItem(item)} className="w-7 h-7 flex items-center justify-center text-[#FF7A00] font-bold active:bg-orange-50">+</button>
                    </div>
                    <p className="text-sm font-bold text-[#111827] w-12 text-right">₹{(item.qty * item.price).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-sm text-[#111827] mb-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FF7A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                Delivery Address
              </p>
              {address ? (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  {address.flat && <p className="text-sm font-semibold text-[#111827]">{address.flat}</p>}
                  <p className="text-xs text-[#6B7280] leading-relaxed mt-0.5">{address.full || address.address || `${address.lat?.toFixed(4)}, ${address.lng?.toFixed(4)}`}</p>
                  <button onClick={() => navigate('/customer/address', { state: { returnTo: '/customer/order' } })} className="text-[#FF7A00] text-xs font-bold mt-2">Change Address</button>
                </div>
              ) : (
                <button onClick={() => navigate('/customer/address', { state: { returnTo: '/customer/order' } })}
                  className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-[#6B7280] text-sm font-semibold hover:border-[#FF7A00] hover:text-[#FF7A00] transition-colors">
                  + Add delivery address
                </button>
              )}
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-sm text-[#111827] mb-3">Payment Method</p>
              <div className="space-y-2">
                {[
                  { id: 'online', label: 'Pay Online', desc: 'UPI, Cards, Net Banking', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                  { id: 'pay_later', label: 'Pay Later', desc: 'Added to balance', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((m) => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all active:scale-[0.98] ${paymentMethod === m.id ? 'bg-[#0F172A] border-2 border-[#0F172A]' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === m.id ? 'bg-white/15' : 'bg-white'}`}>
                      <svg className={`w-4.5 h-4.5 ${paymentMethod === m.id ? 'text-white' : 'text-[#6B7280]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={m.icon} /></svg>
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${paymentMethod === m.id ? 'text-white' : 'text-[#111827]'}`}>{m.label}</p>
                      <p className={`text-[10px] ${paymentMethod === m.id ? 'text-white/60' : 'text-[#6B7280]'}`}>{m.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === m.id ? 'border-[#FF7A00]' : 'border-gray-300'}`}>
                      {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A00]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-sm text-[#111827] mb-2">Delivery Instructions</p>
              <textarea className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none resize-none border border-gray-100 focus:border-[#0F172A] transition-colors" rows={2} placeholder="Any special instructions..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {/* Bill */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-sm text-[#111827] mb-3">Bill Summary</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-[#6B7280]">Item total</span><span className="font-medium text-[#111827]">₹{total.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Delivery fee</span><span className="font-semibold text-emerald-600">FREE</span></div>
                <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between font-bold text-[#111827] text-base">
                  <span>Total</span><span>₹{total.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 z-50">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-medium">Total</p>
              <p className="text-xl font-black text-[#111827]">₹{total.toFixed(0)}</p>
            </div>
            <button onClick={handleOrder} disabled={loading || !address}
              className="bg-[#FF7A00] text-white font-bold py-3.5 px-8 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-orange-200">
              {loading ? 'Processing...' : paymentMethod === 'online' ? 'Pay & Order' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
