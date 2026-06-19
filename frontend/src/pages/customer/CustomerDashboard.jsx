import { useEffect, useState, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/customer/me').catch(() => ({ data: null })),
      api.get('/customer/products').catch(() => ({ data: { products: [] } })),
      api.get('/payments/me').catch(() => ({ data: { balance: 0 } })),
    ]).then(([me, prods, pay]) => {
      setCustomer(me.data);
      setProducts(prods.data.products);
      setBalance(pay.data.balance || 0);
    }).finally(() => setLoading(false));

    // Fetch order notifications
    api.get('/customer/orders').then(({ data }) => {
      const recent = (data.orders || []).slice(0, 5).map((o) => ({
        id: o.id,
        title: o.status === 'delivered' ? 'Order Delivered!' : o.status === 'dispatched' ? 'Order On The Way' : o.status === 'confirmed' ? 'Order Confirmed' : 'Order Placed',
        body: `₹${o.totalValue?.toFixed(0)} · ${o.items?.length || 0} items`,
        status: o.status,
        time: o.updatedAt || o.createdAt,
      }));
      setNotifications(recent);
    }).catch(() => {});
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cartCount = getCartCount();
  const cartTotal = getCartTotal();
  const categories = ['all', ...new Set(products.map((p) => p.unit || 'piece'))];
  let filtered = products;
  if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  if (activeCategory !== 'all') filtered = filtered.filter((p) => (p.unit || 'piece') === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 h-52 bg-[#0F172A]" style={{ borderRadius: '0 0 28px 28px' }} />
        <div className="relative max-w-2xl mx-auto px-5 pt-5 pb-8">
          {/* Top row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-base font-bold">{customer?.shopName || 'Your Shop'}</p>
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p className="text-white/50 text-xs mt-0.5">{customer?.shopLocation?.address?.split(',').slice(0, 2).join(',') || 'Set your delivery location'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {balance > 0 && (
                <div className="bg-red-500/20 rounded-full px-3 py-1.5 border border-red-500/30">
                  <p className="text-[10px] font-bold text-red-400">₹{balance.toFixed(0)} due</p>
                </div>
              )}
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotif(!showNotif)} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 active:scale-95 transition-transform relative">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {notifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF7A00] rounded-full border-2 border-[#0F172A]" />}
                </button>
                {showNotif && (
                  <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 z-[9999] overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="font-bold text-sm text-[#111827]">Order Updates</p>
                      <button onClick={() => navigate('/customer/orders')} className="text-xs text-[#0F172A] font-semibold">View All</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center">
                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                          <p className="text-xs text-gray-400">No updates yet</p>
                        </div>
                      ) : notifications.map((n) => (
                        <button key={n.id} onClick={() => { setShowNotif(false); navigate('/customer/orders'); }}
                          className="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left transition-colors">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.status === 'delivered' ? 'bg-green-100' : n.status === 'dispatched' ? 'bg-blue-100' : n.status === 'confirmed' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                            {n.status === 'delivered' ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : n.status === 'dispatched' ? (
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#111827]">{n.title}</p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">{n.body}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/customer/profile')} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 text-white text-sm font-bold active:scale-95 transition-transform">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
            </div>
          </div>

          {/* Search bar — floating */}
          <div className="bg-white rounded-2xl px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="bg-transparent flex-1 text-sm text-[#111827] outline-none placeholder-gray-400 font-medium" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="active:scale-90 transition-transform"><svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={() => navigate('/customer/order')} className="relative active:scale-90 transition-transform">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF7A00] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-2">
        {/* Category chips */}
        {!search && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  activeCategory === cat
                    ? 'bg-[#0F172A] text-white shadow-md'
                    : 'bg-white text-[#6B7280] border border-gray-200 hover:border-[#0F172A] hover:text-[#0F172A]'
                }`}>
                {cat === 'all' ? 'All Products' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {search ? `Results for "${search}"` : 'Products'}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{filtered.length} items available</p>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-[18px] overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-5 bg-gray-100 rounded w-1/4 mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((p) => {
              const qty = getQty(p.id);
              return (
                <div key={p.id} className="bg-white rounded-[18px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 active:scale-[0.97]">
                  {/* Image */}
                  <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                    {p.images?.length > 0 ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    )}
                    {/* Category badge */}
                    <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[9px] font-bold text-[#6B7280] px-2 py-0.5 rounded-full uppercase tracking-wider border border-gray-100">{p.unit}</span>
                  </div>

                  {/* Content */}
                  <div className="p-3.5">
                    <p className="text-[13px] font-semibold text-[#111827] leading-tight line-clamp-2 min-h-[2.25rem]">{p.name}</p>
                    <div className="flex items-end justify-between mt-3">
                      <p className="text-lg font-black text-[#111827]">₹{p.price}</p>
                      {qty === 0 ? (
                        <button onClick={() => addItem(p)}
                          className="bg-gradient-to-r from-[#FF7A00] to-[#FF9A40] text-white text-[11px] font-bold px-4 py-2 rounded-xl shadow-md shadow-orange-100 active:scale-90 transition-all duration-150">
                          ADD
                        </button>
                      ) : (
                        <div className="flex items-center bg-gradient-to-r from-[#FF7A00] to-[#FF9A40] rounded-xl overflow-hidden shadow-md shadow-orange-100">
                          <button onClick={() => removeItem(p.id)} className="w-8 h-8 flex items-center justify-center text-white font-bold text-lg active:scale-75 transition-transform">−</button>
                          <span className="text-white text-xs font-bold w-5 text-center">{qty}</span>
                          <button onClick={() => addItem(p)} className="w-8 h-8 flex items-center justify-center text-white font-bold text-lg active:scale-75 transition-transform">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="font-semibold text-[#111827] text-lg">No products found</p>
            <p className="text-sm text-[#6B7280] mt-1">{!customer?.linkedOwnerId ? 'Link to a supplier in Profile to see products' : 'Try a different search term'}</p>
          </div>
        )}
      </div>

      {/* Floating Cart Bar — Frosted Glass */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-5 right-5 z-50">
          <button onClick={() => navigate('/customer/order')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between rounded-2xl px-5 py-4 bg-[#0F172A] border border-white/5 active:scale-[0.97] transition-all duration-200"
            style={{ boxShadow: '0 12px 40px rgba(15, 23, 42, 0.4)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-medium opacity-80">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
                <p className="text-white text-base font-bold">₹{cartTotal.toFixed(0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5">
              <p className="text-white text-sm font-bold">View Cart</p>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
