import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/customerCartStore';
import api from '../../api/axios';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { addItem, removeItem, getQty, getCartCount, getCartTotal } = useCartStore();
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [balance, setBalance] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    api.get('/customer/me').then(({ data }) => setCustomer(data)).catch(() => {});
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
    api.get('/payments/me').then(({ data }) => setBalance(data.balance || 0)).catch(() => {});
    api.get('/customer/orders').then(({ data }) => setRecentOrders(data.orders.slice(0, 3))).catch(() => {});
  }, []);

  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  // Get unique categories
  const categories = ['all', ...new Set(products.map((p) => p.unit || 'piece'))];

  // Filter products
  let filtered = products;
  if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  if (activeCategory !== 'all') filtered = filtered.filter((p) => (p.unit || 'piece') === activeCategory);

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-28">
      {/* Header */}
      <div className="bg-[#6C63FF] pb-4">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">{customer?.shopName || 'Your Shop'}</p>
                <p className="text-white/70 text-[10px] truncate max-w-[200px]">{customer?.shopLocation?.address?.split(',').slice(0, 2).join(',') || 'Set location in profile'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {balance > 0 && (
                <div className="bg-red-500 rounded-full px-2 py-0.5">
                  <p className="text-[9px] font-bold text-white">₹{balance.toFixed(0)} due</p>
                </div>
              )}
              <button onClick={() => navigate('/customer/profile')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="bg-transparent flex-1 text-sm outline-none placeholder-gray-400" placeholder="Search for products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Quick links */}
        {!search && (
          <div className="flex gap-3 mt-4 mb-4 overflow-x-auto scrollbar-hide">
            <button onClick={() => navigate('/customer/orders')} className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2 border border-gray-100">
              <span className="text-xl">📦</span>
              <span className="text-xs font-semibold text-gray-700">My Orders</span>
            </button>
            <button onClick={() => navigate('/customer/profile')} className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2 border border-gray-100">
              <span className="text-xl">👤</span>
              <span className="text-xs font-semibold text-gray-700">Profile</span>
            </button>
            {recentOrders.length > 0 && (
              <button onClick={() => navigate('/customer/orders')} className="flex-shrink-0 bg-orange-50 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2 border border-orange-100">
                <span className="text-xl">🔄</span>
                <span className="text-xs font-semibold text-orange-700">Reorder</span>
              </button>
            )}
          </div>
        )}

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeCategory === cat ? 'bg-[#6C63FF] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        <p className="text-sm font-bold text-gray-800 mb-2">
          {search ? `Results for "${search}"` : activeCategory === 'all' ? 'All Products' : activeCategory}
          <span className="text-gray-400 font-normal ml-1">({filtered.length})</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => {
            const qty = getQty(p.id);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-gray-50 h-28 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase">{p.unit}</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5 line-clamp-2 h-9">{p.name}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-base font-black text-gray-900">₹{p.price}</p>
                    {qty === 0 ? (
                      <button onClick={() => addItem(p)}
                        className="bg-[#6C63FF] text-white text-xs font-bold px-4 py-1.5 rounded-lg active:scale-95 transition-all">
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#6C63FF] rounded-lg overflow-hidden">
                        <button onClick={() => removeItem(p.id)} className="w-7 h-7 flex items-center justify-center text-white font-bold text-base">−</button>
                        <span className="text-white text-xs font-bold w-5 text-center">{qty}</span>
                        <button onClick={() => addItem(p)} className="w-7 h-7 flex items-center justify-center text-white font-bold text-base">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-bold text-gray-700">No products found</p>
            {!customer?.linkedOwnerId && <p className="text-sm text-gray-400 mt-1">Link to a supplier in Profile to see products</p>}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <button onClick={() => navigate('/customer/order')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#6C63FF] rounded-2xl px-5 py-4 shadow-[0_8px_30px_rgba(12,131,31,0.4)] active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-lg px-2 py-1">
                <p className="text-white text-xs font-bold">{cartCount}</p>
              </div>
              <p className="text-white/80 text-xs">item{cartCount > 1 ? 's' : ''}</p>
            </div>
            <p className="text-white font-bold">View Cart →</p>
            <p className="text-white font-bold">₹{cartTotal.toFixed(0)}</p>
          </button>
        </div>
      )}
    </div>
  );
}
