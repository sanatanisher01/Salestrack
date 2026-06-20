import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';

function shopIcon(name) {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:all;cursor:pointer">
      <div style="background:#059669;color:white;font-size:10px;font-weight:700;padding:4px 8px;border-radius:16px;white-space:nowrap;box-shadow:0 2px 8px rgba(5,150,105,0.4);border:2px solid white;pointer-events:all">${name.length > 12 ? name.slice(0, 12) + '…' : name}</div>
      <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid #059669;margin-top:-1px"></div>
    </div>`,
    iconSize: [100, 32],
    iconAnchor: [50, 32],
    className: 'shop-marker',
  });
}

function MapFitCustomers({ customers }) {
  const map = useMap();
  useEffect(() => {
    const withLocation = customers.filter((c) => c.shopLocation?.lat);
    if (withLocation.length === 0) return;
    if (withLocation.length === 1) {
      map.setView([withLocation[0].shopLocation.lat, withLocation[0].shopLocation.lng], 14);
    } else {
      const bounds = withLocation.map((c) => [c.shopLocation.lat, c.shopLocation.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [customers]);
  return null;
}

export default function OwnerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('map'); // 'map' or 'list'
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/customer/owner/customers').then(({ data }) => setCustomers(data.customers)).catch(() => {});
  }, []);

  const withLocation = customers.filter((c) => c.shopLocation?.lat);

  return (
    <OwnerLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827]">Customers</h1>
          <p className="text-sm text-[#6B7280]">{customers.length} registered · {withLocation.length} mapped</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setView('map')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Map</button>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>List</button>
        </div>
      </div>

      {view === 'map' && (
        <div className="rounded-3xl overflow-hidden shadow-float border border-gray-100" style={{ height: '55vh' }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={true} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapFitCustomers customers={customers} />
            {withLocation.map((c) => (
              <Marker key={c.uid} position={[c.shopLocation.lat, c.shopLocation.lng]} icon={shopIcon(c.shopName)}
                eventHandlers={{ click: () => setSelected(c) }}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-sm">{c.shopName}</p>
                    <p className="text-xs text-gray-500">{c.ownerName}</p>
                    <p className="text-xs text-gray-400">{c.mobile}</p>
                    {c.shopLocation.address && <p className="text-xs text-gray-400 mt-1">{c.shopLocation.address}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Selected customer card (below map) */}
      {view === 'map' && selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-3 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                {selected.shopName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{selected.shopName}</p>
                <p className="text-xs text-gray-400">{selected.ownerName} · {selected.mobile}</p>
                {selected.gstin && <p className="text-xs text-gray-400">GSTIN: {selected.gstin}</p>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {selected.shopLocation?.address && (
            <div className="mt-2 bg-emerald-50 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-800">{selected.shopLocation.address}</p>
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {customers.map((c) => (
            <div key={c.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                {c.shopName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{c.shopName}</p>
                <p className="text-xs text-gray-400">{c.ownerName} · {c.mobile}</p>
                {c.shopLocation?.address && <p className="text-xs text-gray-400 truncate">{c.shopLocation.address}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {c.gstin && <span className="text-[10px] text-gray-400">{c.gstin}</span>}
                {c.shopLocation ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">📍 Mapped</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">No location</span>
                )}
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-gray-500 font-medium">No customers yet</p>
              <p className="text-sm text-gray-400">Share your supplier code to get customers</p>
            </div>
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
