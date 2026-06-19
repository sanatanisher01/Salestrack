import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { format } from 'date-fns';

const steps = ['pending', 'confirmed', 'dispatched', 'delivered'];
const stepLabels = { pending: 'Order Placed', confirmed: 'Confirmed', dispatched: 'On the Way', delivered: 'Delivered' };
const stepIcons = { pending: '📋', confirmed: '✅', dispatched: '🚚', delivered: '🎉' };

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/customer/orders').then(({ data }) => setOrders(data.orders)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">My Orders</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {orders.map((o) => {
          const isCancelled = o.status === 'cancelled';
          const currentStep = isCancelled ? -1 : steps.indexOf(o.status);
          const isExpanded = expanded === o.id;

          return (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Order header */}
              <div className="px-4 pt-4 pb-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Order #{o.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{o.totalValue?.toFixed(0)}</p>
                    {isCancelled ? (
                      <span className="text-xs font-semibold text-red-500">Cancelled</span>
                    ) : (
                      <span className="text-xs font-semibold text-[#0C831F]">{stepLabels[o.status] || o.status}</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {!isCancelled && (
                  <div className="flex items-center gap-1 mt-3">
                    {steps.map((step, i) => (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${i <= currentStep ? 'bg-[#0C831F] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {i <= currentStep ? '✓' : i + 1}
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-[#0C831F]' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div className="border-t border-gray-50 px-4 py-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                  <div className="space-y-2">
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                        <span className="font-semibold">₹{(item.quantity * item.unitPrice).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  {o.note && <p className="text-xs text-gray-400 mt-2 italic">Note: {o.note}</p>}
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-bold text-gray-700 text-lg">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Your orders will appear here</p>
            <button onClick={() => navigate('/customer')} className="mt-4 bg-[#0C831F] text-white font-bold px-6 py-3 rounded-2xl text-sm">
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
