import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [balance, setBalance] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    api.get('/customer/me').then(({ data }) => setCustomer(data)).catch(() => {});
    api.get('/payments/me').then(({ data }) => { setBalance(data.balance || 0); setTotalPaid(data.totalPaid || 0); }).catch(() => {});
  }, []);

  const handleLogout = async () => { await logout(); navigate('/customer/login'); };

  const updateShopLocation = () => {
    if (!navigator.geolocation) { toast.error('Location not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'JDM/1.0' } });
          if (res.ok) { const d = await res.json(); address = d.display_name || ''; }
        } catch {}
        try {
          await api.patch('/customer/location', { lat: coords.latitude, lng: coords.longitude, address });
          setCustomer((prev) => prev ? { ...prev, shopLocation: { lat: coords.latitude, lng: coords.longitude, address } } : prev);
          toast.success('Location updated!');
        } catch { toast.error('Failed to update location'); }
        setLocating(false);
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const linkOwner = async () => {
    if (!ownerCode.trim()) return;
    setLinking(true);
    try {
      await api.post('/customer/link-owner', { ownerCode: ownerCode.trim() });
      toast.success('Linked to supplier!');
      setOwnerCode('');
      api.get('/customer/me').then(({ data }) => setCustomer(data));
    } catch (err) { toast.error(err.response?.data?.error || 'Invalid code'); }
    finally { setLinking(false); }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customer/reports', report);
      toast.success('Report submitted');
      setShowReport(false);
      setReport({ subject: '', message: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">My Account</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#6C63FF] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {customer?.shopName?.[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <p className="font-bold text-gray-900">{customer?.shopName || user?.name}</p>
            <p className="text-sm text-gray-400">{customer?.email || user?.email}</p>
            {customer?.mobile && <p className="text-sm text-gray-400">{customer.mobile}</p>}
          </div>
        </div>

        {/* Balance card */}
        {(balance > 0 || totalPaid > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Payment Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-400 font-medium">Pending</p>
                <p className="text-xl font-bold text-red-600">₹{balance.toFixed(0)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-500 font-medium">Paid</p>
                <p className="text-xl font-bold text-[#6C63FF]">₹{totalPaid.toFixed(0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Shop details */}
        {customer && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Shop Details</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Owner</span><span className="font-medium text-gray-800">{customer.ownerName}</span></div>
              {customer.gstin && <div className="flex justify-between"><span className="text-gray-400">GSTIN</span><span className="font-medium text-gray-800">{customer.gstin}</span></div>}
              {customer.category && <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="font-medium text-gray-800 capitalize">{customer.category}</span></div>}
              {customer.shopLocation && <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">Location</span><span className="font-medium text-gray-800 text-right text-xs">{customer.shopLocation.address || 'Mapped'}</span></div>}
            </div>
            <button onClick={updateShopLocation} disabled={locating}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-[#6C63FF] text-sm text-[#6C63FF] font-semibold disabled:opacity-50">
              {locating ? 'Getting location...' : customer.shopLocation ? '📍 Update Shop Location' : '📍 Map Your Shop'}
            </button>
          </div>
        )}

        {/* Supplier link */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Supplier</p>
          {customer?.linkedOwnerId ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-semibold text-[#6C63FF]">Connected to your supplier</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-100 focus:border-[#6C63FF]" placeholder="Enter supplier code" value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)} />
              <button onClick={linkOwner} disabled={linking} className="bg-[#6C63FF] text-white text-sm font-bold px-4 rounded-xl disabled:opacity-50">
                {linking ? '...' : 'Link'}
              </button>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => navigate('/customer/orders')} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="font-medium text-sm text-gray-800">My Orders</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => setShowReport(!showReport)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <span className="font-medium text-sm text-gray-800">Report an Issue</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showReport ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Report form */}
        {showReport && (
          <form onSubmit={submitReport} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <input className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-100 focus:border-[#6C63FF]" placeholder="Subject" value={report.subject} onChange={(e) => setReport({ ...report, subject: e.target.value })} required />
            <textarea className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none resize-none border border-gray-100 focus:border-[#6C63FF]" rows={3} placeholder="Describe the issue..." value={report.message} onChange={(e) => setReport({ ...report, message: e.target.value })} required />
            <button type="submit" disabled={submitting} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}

        {/* Logout */}
        <button onClick={handleLogout} className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-3 hover:bg-red-50 transition-colors">
          <span className="text-xl">🚪</span>
          <span className="font-semibold text-red-600 text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
