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
    if (!navigator.geolocation) { toast.error('Not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let address = '';
        try { const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'JDM/1.0' } }); if (res.ok) { const d = await res.json(); address = d.display_name || ''; } } catch {}
        try { await api.patch('/customer/location', { lat: coords.latitude, lng: coords.longitude, address }); setCustomer((p) => p ? { ...p, shopLocation: { lat: coords.latitude, lng: coords.longitude, address } } : p); toast.success('Location updated!'); } catch { toast.error('Failed'); }
        setLocating(false);
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const linkOwner = async () => {
    if (!ownerCode.trim()) return;
    setLinking(true);
    try { await api.post('/customer/link-owner', { ownerCode: ownerCode.trim() }); toast.success('Linked!'); setOwnerCode(''); api.get('/customer/me').then(({ data }) => setCustomer(data)); }
    catch (err) { toast.error(err.response?.data?.error || 'Invalid code'); }
    finally { setLinking(false); }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await api.post('/customer/reports', report); toast.success('Report submitted'); setShowReport(false); setReport({ subject: '', message: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-[#111827] text-base">My Account</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white text-xl font-black flex-shrink-0">
            {customer?.shopName?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#111827] text-base">{customer?.shopName || user?.name}</p>
            <p className="text-xs text-[#6B7280] truncate">{customer?.email || user?.email}</p>
            {customer?.mobile && <p className="text-xs text-[#6B7280]">{customer.mobile}</p>}
          </div>
        </div>

        {/* Payment summary */}
        {(balance > 0 || totalPaid > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Payment Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-xl p-3.5 text-center border border-red-100">
                <p className="text-[10px] text-red-500 font-semibold">Outstanding</p>
                <p className="text-xl font-black text-red-600 mt-0.5">₹{balance.toFixed(0)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3.5 text-center border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-semibold">Total Paid</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">₹{totalPaid.toFixed(0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Shop details */}
        {customer && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Shop Details</p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-[#6B7280]">Owner</span><span className="font-medium text-[#111827]">{customer.ownerName}</span></div>
              {customer.gstin && <div className="flex justify-between"><span className="text-[#6B7280]">GSTIN</span><span className="font-medium text-[#111827]">{customer.gstin}</span></div>}
              {customer.category && <div className="flex justify-between"><span className="text-[#6B7280]">Category</span><span className="font-medium text-[#111827] capitalize">{customer.category}</span></div>}
              {customer.shopLocation && <div className="flex justify-between gap-4"><span className="text-[#6B7280] flex-shrink-0">Location</span><span className="font-medium text-[#111827] text-right text-xs leading-relaxed">{customer.shopLocation.address || 'Mapped'}</span></div>}
            </div>
            <button onClick={updateShopLocation} disabled={locating}
              className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-[#6B7280] font-semibold hover:border-[#0F172A] hover:text-[#0F172A] transition-colors disabled:opacity-50 active:scale-[0.98]">
              {locating ? 'Getting location...' : customer.shopLocation ? 'Update Location' : 'Map Your Shop'}
            </button>
          </div>
        )}

        {/* Supplier */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Supplier</p>
          {customer?.linkedOwnerId ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-semibold text-emerald-700">Connected to your supplier</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" placeholder="Enter supplier code" value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)} />
              <button onClick={linkOwner} disabled={linking} className="bg-[#0F172A] text-white text-sm font-bold px-5 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
                {linking ? '...' : 'Link'}
              </button>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => navigate('/customer/orders')} className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
              <span className="font-medium text-sm text-[#111827]">My Orders</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => setShowReport(!showReport)} className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center"><svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div>
              <span className="font-medium text-sm text-[#111827]">Report an Issue</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showReport ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Report form */}
        {showReport && (
          <form onSubmit={submitReport} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" placeholder="Subject" value={report.subject} onChange={(e) => setReport({ ...report, subject: e.target.value })} required />
            <textarea className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none resize-none border border-gray-200 focus:border-[#0F172A] transition-colors" rows={3} placeholder="Describe the issue..." value={report.message} onChange={(e) => setReport({ ...report, message: e.target.value })} required />
            <button type="submit" disabled={submitting} className="w-full bg-[#FF7A00] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-transform shadow-md shadow-orange-100">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}

        {/* Logout */}
        <button onClick={handleLogout} className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-red-50 transition-colors active:scale-[0.98]">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
          <span className="font-semibold text-sm text-red-600">Logout</span>
        </button>
      </div>
    </div>
  );
}
