import { useEffect, useState } from 'react';
import AccountantLayout from '../../layouts/AccountantLayout';
import api from '../../api/axios';
import { format } from 'date-fns';

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function AccountantOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({ salesmanId: '', startDate: '', endDate: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (filter.salesmanId) params.append('salesmanId', filter.salesmanId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    api.get(`/orders?${params}`).then(({ data }) => setOrders(data.orders)).catch(() => {});
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filter]);

  // Extract unique salesmen from orders for the filter dropdown
  const salesmen = [...new Map(orders.map((o) => [o.salesmanId, { uid: o.salesmanId, name: o.salesmanName }])).values()];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const totalValue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0);

  return (
    <AccountantLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Orders</h1>
        <p className="text-sm text-gray-500">Total: ₹{totalValue.toFixed(0)}</p>
      </div>

      <div className="card mb-4 space-y-3">
        <select className="input" value={filter.salesmanId} onChange={(e) => setFilter({ ...filter, salesmanId: e.target.value })}>
          <option value="">All Salesmen</option>
          {salesmen.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="input" type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} />
          <input className="input" type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} />
        </div>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-medium">{o.customerName}</p>
                <p className="text-sm text-gray-500">{o.salesmanName}</p>
              </div>
              <span className={`badge ${statusColors[o.status]}`}>{o.status}</span>
            </div>
            <p className="text-sm text-gray-600">₹{o.totalValue?.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(o.createdAt)}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders found</p>}
      </div>
    </AccountantLayout>
  );
}
