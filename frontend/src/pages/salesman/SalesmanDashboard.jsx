import { useEffect, useState, useRef } from 'react';
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
  const watchRef = useRef(null);

  useEffect(() => {
    api.get('/salesman/duty/status').then(({ data }) => setDutyStatus(data.dutyStatus));
    api.get('/salesman/orders').then(({ data }) => setOrders(data.orders));
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => api.post('/location/ping', { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }).catch(() => {}),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
  };

  const toggleDuty = async () => {
    setLoading(true);
    try {
      if (dutyStatus === 'off') {
        await api.post('/salesman/duty/start');
        setDutyStatus('on');
        startTracking();
        toast.success('Duty started!');
      } else {
        stopTracking();
        await api.post('/salesman/duty/stop');
        setDutyStatus('off');
        toast.success('Duty ended');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dutyStatus === 'on') startTracking();
    return stopTracking;
  }, [dutyStatus]);

  const todayOrders = orders.filter((o) => {
    const d = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) : new Date(o.createdAt);
    return d.toDateString() === new Date().toDateString();
  });
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalValue || 0), 0);

  const statusColors = { pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-600' };

  return (
    <SalesmanLayout>
      {/* Duty card */}
      <div className={`relative rounded-3xl p-6 mb-5 overflow-hidden transition-all duration-500 ${dutyStatus === 'on' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-gray-700 to-gray-900'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${dutyStatus === 'on' ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-white/80 text-sm font-medium">{dutyStatus === 'on' ? 'Currently tracking your location' : 'You are off duty'}</span>
          </div>
          <p className="text-white/70 text-sm">Status</p>
          <p className="text-white text-3xl font-bold">{dutyStatus === 'on' ? 'On Duty' : 'Off Duty'}</p>
          <button
            onClick={toggleDuty}
            disabled={loading}
            className={`mt-5 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 ${dutyStatus === 'on' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
          >
            {loading ? 'Processing...' : dutyStatus === 'on' ? 'End Duty' : 'Start Duty'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Today's Orders", value: todayOrders.length, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: "Today's Revenue", value: `₹${todayRevenue.toFixed(0)}`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="card text-center p-3">
            <span className={`inline-flex p-1.5 rounded-xl ${s.bg} ${s.color} mx-auto`}>{s.icon}</span>
            <p className={`text-xl font-bold ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Orders</p>
        <Link to="/salesman/orders" className="text-xs text-indigo-600 font-semibold">See all →</Link>
      </div>
      <div className="space-y-2">
        {orders.slice(0, 3).map((o) => (
          <div key={o.id} className="card flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-sm text-gray-900">{o.customerName}</p>
              <p className="text-xs text-gray-400">₹{o.totalValue?.toFixed(2)}</p>
            </div>
            <span className={`badge ${statusColors[o.status]}`}>{o.status}</span>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="card text-center py-8">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-sm text-gray-500">No orders yet</p>
          </div>
        )}
      </div>
    </SalesmanLayout>
  );
}
