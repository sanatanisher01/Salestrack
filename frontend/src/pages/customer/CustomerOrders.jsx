import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { format } from 'date-fns';

const steps = ['pending', 'confirmed', 'dispatched', 'delivered'];
const stepLabels = { pending: 'Placed', confirmed: 'Confirmed', dispatched: 'On the Way', delivered: 'Delivered' };

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customer/orders').then(({ data }) => setOrders(data.orders)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-[#111827] text-base">My Orders</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-3">
        {/* Loading */}
        {loading && [1,2,3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100">
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
            <div className="flex gap-1">{[1,2,3,4].map((j) => <div key={j} className="flex-1 h-1.5 bg-gray-100 rounded-full" />)}</div>
          </div>
        ))}

        {!loading && orders.map((o) => {
          const isCancelled = o.status === 'cancelled';
          const currentStep = isCancelled ? -1 : steps.indexOf(o.status);
          const isExpanded = expanded === o.id;

          return (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform">
              <div className="px-4 pt-4 pb-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#111827] text-sm">Order #{o.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#111827] text-base">₹{o.totalValue?.toFixed(0)}</p>
                    {isCancelled ? (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Cancelled</span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentStep >= 3 ? 'text-emerald-700 bg-emerald-50' : 'text-[#FF7A00] bg-orange-50'}`}>{stepLabels[o.status]}</span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {!isCancelled && (
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${i <= currentStep ? 'bg-[#0F172A] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {i <= currentStep ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : i + 1}
                        </div>
                        {i < steps.length - 1 && <div className={`flex-1 h-[2px] mx-0.5 rounded-full ${i < currentStep ? 'bg-[#0F172A]' : 'bg-gray-200'}`} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3.5 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2.5">Items</p>
                  <div className="space-y-2">
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[#111827] font-medium">{item.productName} <span className="text-[#6B7280] font-normal">× {item.quantity}</span></span>
                        <span className="font-bold text-[#111827]">₹{(item.quantity * item.unitPrice).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  {o.note && <p className="text-[11px] text-[#6B7280] mt-3 italic border-t border-gray-200 pt-2">Note: {o.note}</p>}
                </div>
              )}
            </div>
          );
        })}

        {!loading && orders.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="font-bold text-[#111827] text-lg">No orders yet</p>
            <p className="text-sm text-[#6B7280] mt-1">Your orders will appear here</p>
            <button onClick={() => navigate('/customer')} className="mt-5 bg-[#0F172A] text-white font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-transform">Start Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}
