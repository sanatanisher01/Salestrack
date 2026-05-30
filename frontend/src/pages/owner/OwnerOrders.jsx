import { useEffect, useState } from 'react';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig = {
  pending:    { color: 'bg-amber-100 text-amber-700',     label: 'Pending' },
  confirmed:  { color: 'bg-blue-100 text-blue-700',       label: 'Confirmed' },
  dispatched: { color: 'bg-purple-100 text-purple-700',   label: 'Dispatched' },
  delivered:  { color: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  cancelled:  { color: 'bg-red-100 text-red-600',         label: 'Cancelled' },
};

function formatDate(val) {
  if (!val) return '';
  if (val?.toDate) return format(val.toDate(), 'dd MMM, hh:mm a');
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  return format(new Date(val), 'dd MMM, hh:mm a');
}

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({ status: '', salesmanId: '', source: '' });
  const [team, setTeam] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.salesmanId) params.append('salesmanId', filter.salesmanId);

    // Fetch both salesman orders and customer orders
    Promise.all([
      api.get(`/orders?${params}`),
      api.get('/customer/owner/orders'),
    ]).then(([salesmanRes, customerRes]) => {
      const salesmanOrders = (salesmanRes.data.orders || []).map((o) => ({ ...o, source: 'salesman' }));
      const customerOrders = (customerRes.data.orders || []).map((o) => ({ ...o, source: 'customer', salesmanName: o.customerName + ' (Customer)' }));
      let all = [...salesmanOrders, ...customerOrders];
      // Apply source filter
      if (filter.source === 'salesman') all = all.filter((o) => o.source === 'salesman');
      if (filter.source === 'customer') all = all.filter((o) => o.source === 'customer');
      // Sort by date
      all.sort((a, b) => {
        const ta = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const tb = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setOrders(all);
    }).catch(() => {});
  };

  useEffect(() => {
    api.get('/owner/team').then(({ data }) => setTeam(data.team.filter((m) => m.role === 'salesman')));
    load();
  }, []);

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status, source) => {
    try {
      if (source === 'customer') {
        await api.patch(`/customer/owner/orders/${id}/status`, { status });
      } else {
        await api.patch(`/orders/${id}/status`, { status });
      }
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const exportCSV = async () => {
    const res = await api.get('/orders/export/csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'orders.csv'; a.click();
  };

  const todayRevenue = orders
    .filter((o) => {
      const d = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) : new Date(o.createdAt);
      return d.toDateString() === new Date().toDateString() && o.status !== 'cancelled';
    })
    .reduce((s, o) => s + (o.totalValue || 0), 0);

  const totalRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0);

  return (
    <OwnerLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} orders found</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export
        </button>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Today's Revenue</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">₹{todayRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-3 flex-wrap">
        <select className="input flex-1 min-w-[120px]" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input flex-1 min-w-[120px]" value={filter.salesmanId} onChange={(e) => setFilter({ ...filter, salesmanId: e.target.value })}>
          <option value="">All Salesmen</option>
          {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
        </select>
        <select className="input flex-1 min-w-[120px]" value={filter.source} onChange={(e) => setFilter({ ...filter, source: e.target.value })}>
          <option value="">All Sources</option>
          <option value="salesman">Salesman Orders</option>
          <option value="customer">Customer Orders</option>
        </select>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
            {/* Order header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900">{o.customerName}</p>
                <p className="text-xs text-gray-400">
                  {o.source === 'customer' ? '🛒 Customer order' : `by ${o.salesmanName}`} · {formatDate(o.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${statusConfig[o.status]?.color}`}>{statusConfig[o.status]?.label}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === o.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-gray-800">₹{o.totalValue?.toFixed(2)}</p>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {o.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(o.id, 'confirmed', o.source)} className="btn-primary text-xs px-3 py-1.5">Confirm</button>
                    <button onClick={() => updateStatus(o.id, 'cancelled', o.source)} className="btn-danger text-xs px-3 py-1.5">Cancel</button>
                  </>
                )}
                {o.status === 'confirmed' && (
                  <>
                    {o.source === 'customer' && <button onClick={() => updateStatus(o.id, 'dispatched', o.source)} className="btn-primary text-xs px-3 py-1.5">Dispatch</button>}
                    <button onClick={() => updateStatus(o.id, 'delivered', o.source)} className="btn-success text-xs px-3 py-1.5">Delivered</button>
                  </>
                )}
                {o.status === 'dispatched' && (
                  <button onClick={() => updateStatus(o.id, 'delivered', o.source)} className="btn-success text-xs px-3 py-1.5">Delivered</button>
                )}
              </div>
            </div>

            {/* Expanded items */}
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
                {o.customerPhone && (
                  <p className="text-xs text-gray-500 mt-2">📞 {o.customerPhone}</p>
                )}
                {o.note && (
                  <p className="text-xs text-gray-500 mt-1 italic">Note: {o.note}</p>
                )}
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-gray-500 font-medium">No orders found</p>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
