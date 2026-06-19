import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';

export default function CustomerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    api.get('/customer/me').then(({ data }) => setCustomer(data)).catch(() => {});
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
    api.get('/payments/me').then(({ data }) => setBalance(data.balance || 0)).catch(() => {});
  }, []);

  const addToCart = (p) => setCart((c) => ({ ...c, [p.id]: { ...p, qty: (c[p.id]?.qty || 0) + 1 } }));
  const removeFromCart = (p) => setCart((c) => {
    const qty = (c[p.id]?.qty || 0) - 1;
    if (qty <= 0) { const n = { ...c }; delete n[p.id]; return n; }
    return { ...c, [p.id]: { ...p, qty } };
  });

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  // Group by category
  const categories = [...new Set(products.map((p) => p.category || 'General'))];

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Location + profile row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#0C831F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight">{customer?.shopName || 'Your Shop'}</p>
                <p className="text-[10px] text-gray-500 truncate max-w-[180px]">{customer?.shopLocation?.address?.split(',').slice(0, 2).join(',') || 'Set your location'}</p>
              </div>
              <svg className="w-3 h-3 text-gray-500 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="flex items-center gap-2">
              {balance > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                  <p className="text-[10px] font-bold text-red-600">₹{balance.toFixed(0)} due</p>
                </div>
              )}
              <button onClick={() => navigate('/customer/profile')} className="w-8 h-8 rounded-full bg-[#0C831F] flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              className="bg-transparent flex-1 text-sm outline-none placeholder-gray-400"
              placeholder="Search for products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Delivery time banner */}
        {!search && (
          <div className="bg-[#0C831F] rounded-2xl p-4 mt-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-medium opacity-80">Delivery in</p>
              <p className="text-white text-2xl font-black">10 minutes</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
        )}

        {/* Categories (horizontal scroll) */}
        {!search && categories.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat, i) => {
                const colors = ['bg-yellow-100', 'bg-green-100', 'bg-blue-100', 'bg-pink-100', 'bg-purple-100', 'bg-orange-100'];
                return (
                  <button key={cat} className={`flex-shrink-0 flex flex-col items-center gap-1 ${colors[i % colors.length]} rounded-2xl px-4 py-3 min-w-[72px]`}>
                    <span className="text-2xl">
                      {cat === 'grocery' ? '🛒' : cat === 'medical' ? '💊' : cat === 'electronics' ? '📱' : cat === 'clothing' ? '👕' : cat === 'fmcg' ? '🧴' : '📦'}
                    </span>
                    <p className="text-[10px] font-semibold text-gray-700 capitalize">{cat}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="mb-2">
          <p className="text-sm font-bold text-gray-900 mb-3">{search ? `Results for "${search}"` : 'All Products'}</p>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const qty = cart[p.id]?.qty || 0;
              return (
                <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                  {/* Product image placeholder */}
                  <div className="bg-gray-50 rounded-xl h-24 flex items-center justify-center mb-2">
                    <span className="text-3xl">📦</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">{p.unit}</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5 mb-1">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-gray-900">₹{p.price}</p>
                    {qty === 0 ? (
                      <button onClick={() => addToCart(p)}
                        className="w-8 h-8 rounded-xl bg-white border-2 border-[#0C831F] flex items-center justify-center text-[#0C831F] font-bold text-lg hover:bg-[#0C831F] hover:text-white transition-colors">
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-[#0C831F] rounded-xl px-1.5 py-0.5">
                        <button onClick={() => removeFromCart(p)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-lg">−</button>
                        <span className="text-white text-sm font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => addToCart(p)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-lg">+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-gray-500 font-medium">No products found</p>
              {!customer?.linkedOwnerId && <p className="text-sm text-gray-400 mt-1">Link to a supplier to see products</p>}
            </div>
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
          <button onClick={() => navigate('/customer/order', { state: { cart } })}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#0C831F] rounded-2xl px-5 py-4 shadow-2xl">
            <div className="bg-[#0a6b19] rounded-xl px-2.5 py-1.5">
              <p className="text-white text-sm font-bold">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
            </div>
            <p className="text-white font-bold text-sm">View Cart</p>
            <p className="text-white font-bold text-sm">₹{cartTotal.toFixed(0)}</p>
          </button>
        </div>
      )}
    </div>
  );
}
