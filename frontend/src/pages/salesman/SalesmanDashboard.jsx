import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SalesmanLayout from '../../layouts/SalesmanLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function SalesmanDashboard() {
  const { user } = useAuthStore();
  const [dutyStatus, setDutyStatus] = useState('off');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/salesman/duty/status').then(({ data }) => setDutyStatus(data.dutyStatus)).catch(() => {});
    api.get('/salesman/orders').then(({ data }) => setOrders(data.orders)).catch(() => {});
  }, []);

  const toggleDuty = async () => {
    setLoading(true);
    try {
      if (dutyStatus === 'off') {
        await api.post('/salesman/duty/start');
        setDutyStatus('on');
        toast.success('Duty started! Go to Map to see tracking.');
      } else {
        await api.post('/salesman/duty/stop');
        setDutyStatus('off');
        toast.success('Duty ended');
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const todayOrders = orders.filter((o) => {
    const d = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) : new Date(o.createdAt);
    return d.toDateString() === new Date().toDateString();
  });
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0);

  const statusColors = { pending: 'bg-amber-50 text-amber-700 border-amber-100', confirmed: 'bg-blue-50 text-blue-700 border-blue-100', delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100', cancelled: 'bg-red-50 text-red-600 border-red-100' };

  return (
    <SalesmanLayout>
      {/* Duty card */}
      <div className={`rounded-2xl p-6 mb-5 ${dutyStatus === 'on' ? 'bg-emerald-600' : 'bg-[#0F172A]'}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2.5 h-2.5 rounded-full ${dutyStatus === 'on' ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-white/70 text-sm font-medium">{dutyStatus === 'on' ? 'Tracking your location' : 'Off duty'}</span>
        </div>
        <p className="text-white text-3xl font-black">{dutyStatus === 'on' ? 'On Duty' : 'Off Duty'}</p>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={toggleDuty} disabled={loading}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 ${dutyStatus === 'on' ? 'bg-white/20 text-white' : 'bg-[#FF7A00] text-white shadow-md shadow-orange-200'}`}>
            {loading ? '...' : dutyStatus === 'on' ? 'End Duty' : 'Start Duty'}
          </button>
          {dutyStatus === 'on' && (
            <Link to="/salesman/map" className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white active:scale-95 transition-transform">
              View Map →
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Today's Orders", value: todayOrders.length, color: 'text-blue-600' },
          { label: "Revenue", value: `₹${todayRevenue.toFixed(0)}`, color: 'text-emerald-600' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-sm">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Recent Orders</p>
        <Link to="/salesman/orders" className="text-xs text-[#0F172A] font-semibold">See all →</Link>
      </div>
      <div className="space-y-2">
        {orders.slice(0, 4).map((o) => (
          <div key={o.id} className="bg-white rounded-2xl flex items-center justify-between p-4 border border-gray-100 shadow-sm">
            <div>
              <p className="font-semibold text-sm text-[#111827]">{o.customerName}</p>
              <p className="text-xs text-[#6B7280]">₹{o.totalValue?.toFixed(0)}</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColors[o.status]}`}>{o.status}</span>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl text-center py-10 border border-gray-100">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-sm text-[#6B7280] font-medium">No orders yet</p>
          </div>
        )}
      </div>
    </SalesmanLayout>
  );
}
