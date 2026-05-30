import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const { user, setToken } = useAuthStore();
  const [form, setForm] = useState({ shopName: '', ownerName: '', mobile: '', gstin: '', category: '', ownerCode: '' });
  const [shopLocation, setShopLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const mapShop = () => {
    if (!navigator.geolocation) { toast.error('Location not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude, address: '' };
        // Try reverse geocode
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'User-Agent': 'SalesTrack/1.0' } });
          const data = await res.json();
          loc.address = data.display_name || '';
        } catch {}
        setShopLocation(loc);
        setLocating(false);
        toast.success('Shop location saved!');
      },
      () => { setLocating(false); toast.error('Could not get location. Enable GPS.'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/customer/register', { ...form, shopLocation });
      setToken(useAuthStore.getState().token, { uid: data.customer.uid, name: data.customer.shopName, email: data.customer.email, role: 'customer' });
      toast.success('Registration complete!');
      navigate('/customer');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Register Your Shop</h1>
          <p className="text-sm text-gray-500">Fill in your shop details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="card shadow-float p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Shop Name *</label>
            <input className="input" placeholder="Your shop name" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Owner Name *</label>
            <input className="input" placeholder="Shop owner's name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Mobile Number *</label>
            <input className="input" type="tel" placeholder="9876543210" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">GSTIN (optional)</label>
            <input className="input" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Shop Category (optional)</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              <option value="grocery">Grocery</option>
              <option value="medical">Medical</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="hardware">Hardware</option>
              <option value="fmcg">FMCG</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Owner/Supplier Code (optional)</label>
            <input className="input" placeholder="Enter code given by your supplier" value={form.ownerCode} onChange={(e) => setForm({ ...form, ownerCode: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">You can add this later too</p>
          </div>

          {/* Map Shop Location */}
          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-emerald-800">Shop Location</p>
              <button type="button" onClick={mapShop} disabled={locating}
                className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {locating ? 'Locating...' : shopLocation ? '📍 Update Location' : '📍 Map Your Shop'}
              </button>
            </div>
            {shopLocation ? (
              <p className="text-xs text-emerald-700">{shopLocation.address || `${shopLocation.lat.toFixed(5)}, ${shopLocation.lng.toFixed(5)}`}</p>
            ) : (
              <p className="text-xs text-gray-400">Tap "Map Your Shop" to save your shop's GPS location</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
