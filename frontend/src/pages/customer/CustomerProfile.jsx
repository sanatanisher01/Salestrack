import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [ownerCode, setOwnerCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const updateShopLocation = () => {
    if (!navigator.geolocation) { toast.error('Location not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'JDM/1.0' } });
          if (res.ok) { const data = await res.json(); address = data.display_name || ''; }
        } catch {}
        try {
          await api.patch('/customer/location', { lat: coords.latitude, lng: coords.longitude, address });
          setCustomer((prev) => prev ? { ...prev, shopLocation: { lat: coords.latitude, lng: coords.longitude, address } } : prev);
          toast.success('Shop location updated!');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to update location');
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) toast.error('Location permission denied');
        else toast.error('Could not get location. Make sure GPS is on.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    api.get('/customer/me').then(({ data }) => setCustomer(data)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/customer/login');
  };

  const linkOwner = async () => {
    if (!ownerCode.trim()) return;
    setLinking(true);
    try {
      await api.post('/customer/link-owner', { ownerCode: ownerCode.trim() });
      toast.success('Linked to supplier!');
      setOwnerCode('');
      api.get('/customer/me').then(({ data }) => setCustomer(data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code');
    } finally {
      setLinking(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customer/reports', report);
      toast.success('Report submitted');
      setShowReport(false);
      setReport({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      {/* Avatar */}
      <div className="flex flex-col items-center py-6 mb-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-200 mb-3">
          {customer?.shopName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'C'}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{customer?.shopName || user?.name}</h1>
        <p className="text-sm text-gray-400">{customer?.email || user?.email}</p>
        {customer?.mobile && <p className="text-sm text-gray-400">{customer.mobile}</p>}
        <span className="mt-2 badge bg-emerald-100 text-emerald-700">Customer</span>
      </div>

      <div className="space-y-3">
        {/* Shop details */}
        {customer && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Shop Details</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-400">Owner:</span> <span className="text-gray-800 font-medium">{customer.ownerName}</span></p>
              {customer.gstin && <p><span className="text-gray-400">GSTIN:</span> <span className="text-gray-800 font-medium">{customer.gstin}</span></p>}
              {customer.category && <p><span className="text-gray-400">Category:</span> <span className="text-gray-800 font-medium capitalize">{customer.category}</span></p>}
              {customer.shopLocation && <p><span className="text-gray-400">Location:</span> <span className="text-gray-800 font-medium">{customer.shopLocation.address || `${customer.shopLocation.lat?.toFixed(4)}, ${customer.shopLocation.lng?.toFixed(4)}`}</span></p>}
            </div>
            <button onClick={updateShopLocation} disabled={locating}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-sm text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50">
              {locating ? 'Getting location...' : customer.shopLocation ? '📍 Update Shop Location' : '📍 Map Your Shop'}
            </button>
          </div>
        )}

        {/* Link to owner */}
        <div className="card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            {customer?.linkedOwnerId ? 'Supplier Linked ✓' : 'Link to Supplier'}
          </p>
          {customer?.linkedOwnerId ? (
            <p className="text-sm text-emerald-600 font-medium">Connected to your supplier</p>
          ) : (
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Enter supplier code" value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)} />
              <button onClick={linkOwner} disabled={linking} className="bg-emerald-600 text-white text-sm font-semibold px-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {linking ? '...' : 'Link'}
              </button>
            </div>
          )}
        </div>

        {/* Report issue */}
        <div className="card">
          <button onClick={() => setShowReport(!showReport)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <p className="font-semibold text-sm text-gray-800">Report an Issue</p>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showReport ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showReport && (
            <form onSubmit={submitReport} className="mt-4 space-y-3 pt-4 border-t border-gray-50">
              <input className="input" placeholder="Subject" value={report.subject} onChange={(e) => setReport({ ...report, subject: e.target.value })} required />
              <textarea className="input resize-none" placeholder="Describe the issue..." rows={3} value={report.message} onChange={(e) => setReport({ ...report, message: e.target.value })} required />
              <button type="submit" disabled={submitting} className="btn-primary w-full bg-orange-500 hover:bg-orange-600">{submitting ? 'Submitting...' : 'Submit Report'}</button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="card w-full flex items-center gap-3 hover:bg-rose-50 transition-colors border border-rose-100">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
          <p className="font-semibold text-sm text-rose-600">Logout</p>
        </button>
      </div>
    </CustomerLayout>
  );
}
