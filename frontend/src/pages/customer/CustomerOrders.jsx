import { useEffect, useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import api from '../../api/axios';
import { format } from 'date-fns';

const statusConfig = {
  pending:    { color: 'bg-amber-100 text-amber-700', label: 'Pending', step: 1 },
  confirmed:  { color: 'bg-blue-100 text-blue-700', label: 'Confirmed', step: 2 },
  dispatched: { color: 'bg-purple-100 text-purple-700', label: 'Dispatched', step: 3 },
  delivered:  { color: 'bg-emerald-100 text-emerald-700', label: 'Delivered', step: 4 },
  cancelled:  { color: 'bg-red-100 text-red-600', label: 'Cancelled', step: 0 },
};

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/customer/orders').then(({ data }) => setOrders(data.orders)).catch(() => {});
  }, []);

  return (
    <CustomerLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500">{orders.length} orders</p>
      </div>

      <div className="space-y-3">
        {orders.map((o) => {
          const status = statusConfig[o.status] || statusConfig.pending;
          return (
            <div key={o.id} className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">₹{o.totalValue?.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                </div>
                <span className={`badge ${status.color}`}>{status.label}</span>
              </div>

              {/* Progress bar */}
              {o.status !== 'cancelled' && (
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= status.step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
              )}

              {expanded === o.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
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
                  {o.note && <p className="text-xs text-gray-500 mt-2 italic">Note: {o.note}</p>}
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400">Place your first order to see it here</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
