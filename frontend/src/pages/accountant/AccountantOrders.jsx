import { useEffect, useState } from 'react';
import AccountantLayout from '../../layouts/AccountantLayout';
import api from '../../api/axios';
import { format } from 'date-fns';

const statusConfig = {
  pending:    { color: 'bg-amber-100 text-amber-700',     label: 'Pending' },
  confirmed:  { color: 'bg-blue-100 text-blue-700',       label: 'Confirmed' },
  dispatched: { color: 'bg-purple-100 text-purple-700',   label: 'Dispatched' },
  delivered:  { color: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  cancelled:  { color: 'bg-red-100 text-red-600',         label: 'Cancelled' },
};

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function AccountantOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    // Fetch both salesman and customer orders
    Promise.all([
      api.get('/orders').catch(() => ({ data: { orders: [] } })),
      api.get('/customer/owner/orders').catch(() => ({ data: { orders: [] } })),
    ]).then(([salesmanRes, customerRes]) => {
      const salesmanOrders = (salesmanRes.data.orders || []).map((o) => ({ ...o, source: 'salesman' }));
      const customerOrders = (customerRes.data.orders || []).map((o) => ({ ...o, source: 'customer', salesmanName: o.customerName + ' (Customer)' }));
      const all = [...salesmanOrders, ...customerOrders];
      all.sort((a, b) => {
        const ta = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const tb = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setOrders(all);
    });
  }, []);

  let filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  if (sourceFilter) filtered = filtered.filter((o) => o.source === sourceFilter);

  const totalRevenue = filtered.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0);

  return (
    <AccountantLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-black text-[#111827]">Orders</h1>
        <p className="text-sm text-[#6B7280]">{orders.length} orders · ₹{totalRevenue.toFixed(0)} revenue</p>
      </div>

      {/* Source filter */}
      <div className="flex gap-2 mb-3">
        {[['', 'All'], ['salesman', 'Salesman'], ['customer', 'Customer']].map(([val, label]) => (
          <button key={val} onClick={() => setSourceFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${sourceFilter === val ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', 'pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${filter === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && <span className="ml-1 opacity-70">({orders.filter(o => o.status === s).length})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold text-gray-900">{o.customerName}</p>
                <p className="text-xs text-gray-400">
                  {o.source === 'customer' ? '🛒 Customer order' : `by ${o.salesmanName}`} · {formatDate(o.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`badge ${statusConfig[o.status]?.color || 'bg-gray-100 text-gray-500'}`}>{statusConfig[o.status]?.label || o.status}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === o.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-800">₹{o.totalValue?.toFixed(2)}</p>

            {expanded === o.id && (
              <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-1.5">
                  {o.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.productName}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity} × ₹{item.unitPrice}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-700">₹{(item.quantity * item.unitPrice).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                {o.customerPhone && <p className="text-xs text-gray-500 mt-2">📞 {o.customerPhone}</p>}
                {o.note && <p className="text-xs text-gray-500 mt-1 italic">Note: {o.note}</p>}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} orders</p>
          </div>
        )}
      </div>
    </AccountantLayout>
  );
}
