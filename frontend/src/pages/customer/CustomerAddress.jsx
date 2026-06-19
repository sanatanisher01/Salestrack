import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:16px;height:16px;background:#0C831F;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
    <div style="width:2px;height:16px;background:#0C831F;margin-top:-2px"></div>
    <div style="width:8px;height:4px;background:rgba(0,0,0,0.2);border-radius:50%;margin-top:2px"></div>
  </div>`,
  iconSize: [20, 40],
  iconAnchor: [10, 40],
});

function MapMover({ position }) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (!position) return;
    if (firstRef.current) { map.setView(position, 17); firstRef.current = false; }
    else map.panTo(position, { animate: true });
  }, [position]);
  return null;
}

export default function CustomerAddress() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/customer/order';

  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(true);
  const [form, setForm] = useState({ flat: '', landmark: '', label: 'home' });
  const [saving, setSaving] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Load saved addresses
    api.get('/customer/me').then(({ data }) => {
      if (data.savedAddresses) setSavedAddresses(data.savedAddresses);
      if (data.shopLocation?.lat) {
        setPosition([data.shopLocation.lat, data.shopLocation.lng]);
        setAddress(data.shopLocation.address || '');
        setLocating(false);
      } else {
        getCurrentLocation();
      }
    }).catch(() => getCurrentLocation());
  }, []);

  const getCurrentLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        setPosition(pos);
        await reverseGeocode(coords.latitude, coords.longitude);
        setLocating(false);
      },
      () => { setLocating(false); toast.error('Enable location access'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, { headers: { 'User-Agent': 'JDM/1.0' } });
      if (res.ok) {
        const data = await res.json();
        setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const handleMapDrag = (e) => {
    const { lat, lng } = e.target.getCenter();
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const confirmAddress = async () => {
    if (!position) { toast.error('Select a location'); return; }
    if (!form.flat.trim()) { toast.error('Enter flat/house number'); return; }

    setSaving(true);
    const fullAddress = {
      lat: position[0],
      lng: position[1],
      address: address,
      flat: form.flat.trim(),
      landmark: form.landmark.trim(),
      label: form.label,
      full: `${form.flat.trim()}${form.landmark ? ', ' + form.landmark.trim() : ''}, ${address}`,
    };

    try {
      // Save to customer's addresses
      await api.patch('/customer/location', { lat: position[0], lng: position[1], address: fullAddress.full });
      // Save to local storage for quick access
      const saved = [...savedAddresses.filter((a) => a.label !== form.label), fullAddress];
      localStorage.setItem('jdm-saved-addresses', JSON.stringify(saved));
      setSavedAddresses(saved);
      // Navigate back with the selected address
      navigate(returnTo, { state: { selectedAddress: fullAddress } });
      toast.success('Address saved!');
    } catch {
      toast.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const selectSavedAddress = (addr) => {
    navigate(returnTo, { state: { selectedAddress: addr } });
  };

  // Load saved addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jdm-saved-addresses');
    if (saved) try { setSavedAddresses(JSON.parse(saved)); } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white sticky top-0 z-[1000] border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Select Delivery Address</h1>
        </div>
      </div>

      {/* Saved addresses */}
      {savedAddresses.length > 0 && !showForm && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Saved Addresses</p>
          <div className="space-y-2 mb-4">
            {savedAddresses.map((addr, i) => (
              <button key={i} onClick={() => selectSavedAddress(addr)}
                className="w-full flex items-start gap-3 bg-gray-50 rounded-xl p-3 text-left hover:bg-green-50 transition-colors border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">{addr.label === 'home' ? '🏠' : addr.label === 'work' ? '🏢' : '📍'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 capitalize">{addr.label}</p>
                  <p className="text-xs text-gray-500 truncate">{addr.flat}{addr.landmark ? ', ' + addr.landmark : ''}</p>
                  <p className="text-[10px] text-gray-400 truncate">{addr.address}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#0C831F] text-[#0C831F] text-sm font-semibold mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add New Address
          </button>
        </div>
      )}

      {/* Map + Form (shown when adding new or no saved addresses) */}
      {(showForm || savedAddresses.length === 0) && (
        <>
          {/* Map */}
          <div className="relative flex-shrink-0" style={{ height: '40vh' }}>
            {position ? (
              <MapContainer
                center={position}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                whenReady={(map) => { map.target.on('moveend', () => handleMapDrag({ target: map.target })); }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <MapMover position={position} />
                <Marker position={position} icon={pinIcon} />
              </MapContainer>
            ) : (
              <div className="h-full bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400">{locating ? 'Getting your location...' : 'Location unavailable'}</p>
              </div>
            )}

            {/* Use current location button */}
            <button onClick={getCurrentLocation}
              className="absolute bottom-4 right-4 z-[999] bg-white shadow-lg rounded-full px-4 py-2.5 flex items-center gap-2 border border-gray-200 hover:bg-gray-50 active:scale-95">
              <svg className="w-4 h-4 text-[#0C831F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
              <span className="text-xs font-semibold text-gray-700">Use my location</span>
            </button>

            {/* Drag instruction */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
              <p className="text-[10px] font-medium text-gray-600">Move map to adjust pin</p>
            </div>
          </div>

          {/* Address details form */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10 px-4 pt-5 pb-28">
            <div className="max-w-2xl mx-auto">
              {/* Detected address */}
              <div className="flex items-start gap-2 mb-4 bg-green-50 rounded-xl p-3">
                <svg className="w-4 h-4 text-[#0C831F] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                <p className="text-xs text-gray-700 leading-relaxed flex-1">{address || 'Detecting address...'}</p>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Flat / House / Shop No. *</label>
                  <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0C831F] transition-colors" placeholder="e.g. Shop 12, Ground Floor" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Landmark (optional)</label>
                  <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0C831F] transition-colors" placeholder="e.g. Near Bus Stand" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Save as</label>
                  <div className="flex gap-2">
                    {[{ value: 'home', label: '🏠 Home' }, { value: 'work', label: '🏢 Work' }, { value: 'other', label: '📍 Other' }].map((opt) => (
                      <button key={opt.value} onClick={() => setForm({ ...form, label: opt.value })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.label === opt.value ? 'bg-[#0C831F] text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
            <div className="max-w-2xl mx-auto">
              <button onClick={confirmAddress} disabled={saving || !position || !form.flat.trim()}
                className="w-full bg-[#0C831F] text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50 active:scale-[0.98] transition-all">
                {saving ? 'Saving...' : 'Confirm & Save Address'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
