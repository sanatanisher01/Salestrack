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

  useEffect(() => {
    api.get('/customer/me').then(({ data }) => setCustomer(data)).catch(() => {});
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
    api.get('/payments/me').then(({ data }) => setBalance(data.balance || 0)).catch(() => {});
  }, []);

  const cartCount = getCartCount();
  const cartTotal = getCartTotal();
  const categories = ['all', ...new Set(products.map((p) => p.unit || 'piece'))];
  let filtered = products;
  if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  if (activeCategory !== 'all') filtered = filtered.filter((p) => (p.unit || 'piece') === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-50 shadow-md" style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">{customer?.shopName || 'Your Shop'}</p>
                <p className="text-white/70 text-[10px] truncate max-w-[180px]">{customer?.shopLocation?.address?.split(',').slice(0, 2).join(',') || 'Set location in profile'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {balance > 0 && (
                <div className="bg-red-500 rounded-full px-2.5 py-1">
                  <p className="text-[9px] font-bold text-white">₹{balance.toFixed(0)} due</p>
                </div>
              )}
              <button onClick={() => navigate('/customer/orders')} className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </button>
              <button onClick={() => navigate('/customer/profile')} className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="bg-transparent flex-1 text-sm text-gray-800 outline-none placeholder-gray-400" placeholder="Search for products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Category tabs */}
        {!search && (
          <div className="flex gap-2 mt-4 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-[#6C63FF] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Products header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[#111827]">
            {search ? `Results for "${search}"` : activeCategory === 'all' ? 'All Products' : activeCategory}
            <span className="text-gray-400 font-normal ml-1.5">({filtered.length})</span>
          </p>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => {
            const qty = getQty(p.id);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gray-50 h-32 flex items-center justify-center border-b border-gray-100">
                  {p.images?.length > 0 ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{p.unit}</p>
                  <p className="text-sm font-semibold text-[#111827] leading-tight mt-0.5 line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-base font-black text-[#111827]">₹{p.price}</p>
                    {qty === 0 ? (
                      <button onClick={() => addItem(p)}
                        className="bg-[#F97316] text-white text-xs font-bold px-4 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm shadow-orange-200">
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#F97316] rounded-lg overflow-hidden shadow-sm shadow-orange-200">
                        <button onClick={() => removeItem(p.id)} className="w-7 h-7 flex items-center justify-center text-white font-bold text-lg">−</button>
                        <span className="text-white text-xs font-bold w-5 text-center">{qty}</span>
                        <button onClick={() => addItem(p)} className="w-7 h-7 flex items-center justify-center text-white font-bold text-lg">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="font-semibold text-gray-500">No products found</p>
            {!customer?.linkedOwnerId && <p className="text-sm text-gray-400 mt-1">Link to a supplier in Profile</p>}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <button onClick={() => navigate('/customer/order')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#6C63FF] rounded-2xl px-5 py-4 shadow-lg shadow-purple-200 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <p className="text-white text-sm font-medium">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-base">₹{cartTotal.toFixed(0)}</p>
              <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
