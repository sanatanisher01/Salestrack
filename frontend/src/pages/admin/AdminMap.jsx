import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../api/axios';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function salesmanIcon(name, color, isSelected) {
  const c = isSelected ? '#4f46e5' : color;
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;pointer-events:all">
      <div style="background:${c};color:white;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 12px ${c}55;border:2px solid white;pointer-events:all">${name.split(' ')[0]}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${c};margin-top:-1px"></div>
    </div>`,
    iconSize: [90, 38],
    iconAnchor: [45, 38],
    className: 'salesman-marker',
  });
}

function MapRecenter({ lat, lng }) {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (centered.current) return;
    map.setView([lat, lng], 12);
    centered.current = true;
  }, [lat, lng]);
  return null;
}

export default function AdminMap() {
  const [salesmen, setSalesmen] = useState([]);
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState(null);
  const [trails, setTrails] = useState({});
  const intervalRef = useRef(null);
  const trailIntervalRef = useRef(null);

  const fetchTrail = async (salesmanId) => {
    try {
      const { data } = await api.get(`/admin/trail/${salesmanId}`);
      setTrails((prev) => ({ ...prev, [salesmanId]: data.trail }));
    } catch {}
  };

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const { data } = await api.get('/admin/live');
        setSalesmen(data.live);
        setPanel((prev) => prev ? (data.live.find((s) => s.uid === prev.uid) || prev) : null);
        // refresh trails for all visible salesmen
        data.live.forEach((s) => fetchTrail(s.uid));
      } catch {}
    };
    fetchLive();
    intervalRef.current = setInterval(fetchLive, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Refresh selected salesman trail every 10s
  useEffect(() => {
    if (trailIntervalRef.current) clearInterval(trailIntervalRef.current);
    if (!selected) return;
    trailIntervalRef.current = setInterval(() => fetchTrail(selected), 10000);
    return () => clearInterval(trailIntervalRef.current);
  }, [selected]);

  const selectSalesman = (s) => {
    setSelected(s.uid);
    setPanel(s);
    fetchTrail(s.uid);
  };

  const center = salesmen.length > 0
    ? [salesmen[0].liveLocation.lat, salesmen[0].liveLocation.lng]
    : [20.5937, 78.9629];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
          <p className="text-sm text-gray-500">{salesmen.length} salesman{salesmen.length !== 1 ? 'en' : ''} active across all owners</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-500">Live · every 15s</span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 rounded-3xl shadow-sm border border-gray-100" style={{ height: '65vh' }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }} zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {salesmen.length > 0 && <MapRecenter lat={center[0]} lng={center[1]} />}
            {salesmen.map((s, i) => {
              const color = COLORS[i % COLORS.length];
              const trail = trails[s.uid] || [];
              return (
                <span key={s.uid}>
                  {trail.length > 1 && (
                    <>
                      <Polyline positions={trail} pathOptions={{ color, weight: 4, opacity: 0.8 }} />
                      <Marker position={trail[0]} icon={L.divIcon({ className: '', html: `<div style="width:10px;height:10px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 4px ${color}88"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] })} />
                    </>
                  )}
                  <Marker
                    position={[s.liveLocation.lat, s.liveLocation.lng]}
                    icon={salesmanIcon(s.name, color, selected === s.uid)}
                    eventHandlers={{ click: () => selectSalesman(s) }}
                  />
                </span>
              );
            })}
          </MapContainer>
        </div>

        {/* Desktop side panel */}
        <div className="hidden lg:flex flex-col gap-3 w-64 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <div className="card flex-shrink-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">All Active Salesmen</p>
            {salesmen.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                <p className="text-sm text-gray-500">No one on duty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {salesmen.map((s, i) => {
                  const color = COLORS[i % COLORS.length];
                  return (
                    <button key={s.uid} onClick={() => selectSalesman(s)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all ${selected === s.uid ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
                        {s.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {panel && (
            <div className="card border border-indigo-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Details</p>
                <button onClick={() => { setPanel(null); setSelected(null); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                  {panel.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{panel.name}</p>
                  <p className="text-xs text-gray-400 truncate">{panel.phone || panel.email}</p>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-3 mb-2">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">Current Address</p>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  {panel.liveLocation?.address || 'Fetching address...'}
                </p>
              </div>
              {(trails[panel.uid]?.length || 0) > 0 && (
                <p className="text-xs text-indigo-600 font-semibold">{trails[panel.uid].length} trail points</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile info card */}
      {panel && (
        <div className="lg:hidden mt-3 card border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {panel.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{panel.name}</p>
                <p className="text-xs text-gray-400">{panel.phone || panel.email}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">● On Duty</p>
              </div>
            </div>
            <button onClick={() => { setPanel(null); setSelected(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">Current Address</p>
            <p className="text-xs text-indigo-900 leading-relaxed">
              {panel.liveLocation?.address || 'Fetching address...'}
            </p>
          </div>
        </div>
      )}

      {salesmen.length === 0 && !panel && (
        <p className="text-center text-gray-400 text-sm mt-4">No salesmen currently on duty</p>
      )}
    </AdminLayout>
  );
}
