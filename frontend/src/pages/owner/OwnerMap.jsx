import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '../../store/authStore';
import OwnerLayout from '../../layouts/OwnerLayout';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

function markerIcon(name, color, isSelected) {
  const c = isSelected ? '#4f46e5' : color;
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:all;cursor:pointer">
      <div style="background:${c};color:white;font-size:11px;font-weight:700;padding:5px 11px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 14px ${c}66;border:2.5px solid white;pointer-events:all">${name.split(' ')[0]}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${c};margin-top:-1px"></div>
    </div>`,
    iconSize: [90, 38],
    iconAnchor: [45, 38],
    className: 'salesman-marker',
  });
}

function dotIcon(color, size = 10) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}88"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapFit({ live }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || live.length === 0) return;
    if (live.length === 1) {
      map.setView([live[0].lat, live[0].lng], 15);
    } else {
      const bounds = live.map((s) => [s.lat, s.lng]);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
    fitted.current = true;
  }, [live]);
  return null;
}

// Zoom to salesman when selected
function ZoomToSalesman({ salesman, trail }) {
  const map = useMap();
  const lastSelectedRef = useRef(null);

  useEffect(() => {
    if (!salesman) return;
    if (lastSelectedRef.current === salesman.uid) return; // Don't re-zoom same salesman
    lastSelectedRef.current = salesman.uid;

    if (trail && trail.length > 1) {
      // Fit the trail bounds
      const bounds = L.latLngBounds(trail);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
    } else {
      // Zoom to salesman position
      map.setView([salesman.lat, salesman.lng], 16, { animate: true });
    }
  }, [salesman?.uid, trail?.length > 1]);

  return null;
}

export default function OwnerMap() {
  const { user, firebaseReady } = useAuthStore();
  const [salesmen, setSalesmen] = useState([]);
  const [trails, setTrails] = useState({});
  // Persist selected salesman across refreshes
  const [selected, setSelected] = useState(() => sessionStorage.getItem('ownermap_selected') || null);
  const [panel, setPanel] = useState(null);
  const [showList, setShowList] = useState(false);

  // Restore panel from salesmen when they load
  useEffect(() => {
    if (selected && salesmen.length > 0 && !panel) {
      const s = salesmen.find((sm) => sm.uid === selected);
      if (s) setPanel(s);
    }
  }, [salesmen, selected]);

  // Real-time listener for salesman positions
  useEffect(() => {
    if (!firebaseReady || !user?.uid) return;

    const q = query(
      collection(db, 'users'),
      where('ownerId', '==', user.uid),
      where('role', '==', 'salesman')
    );

    const unsub = onSnapshot(q, (snap) => {
      const live = [];
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.liveLocation?.lat && d.liveLocation?.lng && d.dutyStatus === 'on') {
          live.push({
            uid: doc.id,
            name: d.name,
            email: d.email,
            phone: d.phone || '',
            lat: d.liveLocation.lat,
            lng: d.liveLocation.lng,
            address: d.liveLocation.address || null,
            activeSessionId: d.activeSessionId,
          });
        }
      });
      setSalesmen(live);
      setPanel((prev) => prev ? (live.find((s) => s.uid === prev.uid) || prev) : null);
    }, (err) => {
      console.error('Live location listener error:', err);
    });

    return () => unsub();
  }, [firebaseReady, user?.uid]);

  // Real-time trail listener for selected salesman
  useEffect(() => {
    if (!firebaseReady || !selected) return;
    const salesman = salesmen.find((s) => s.uid === selected);
    if (!salesman?.activeSessionId) return;

    // Query by sessionId AND ownerId so Firestore rules allow access
    const q = query(
      collection(db, 'locationPings'),
      where('sessionId', '==', salesman.activeSessionId),
      where('ownerId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const points = snap.docs
        .map((doc) => doc.data())
        .sort((a, b) => {
          const ta = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
          const tb = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
          return ta - tb;
        })
        .map((p) => [p.lat, p.lng]);
      setTrails((prev) => ({ ...prev, [selected]: points }));
    }, (err) => {
      console.error('Trail listener error:', err);
    });

    return () => unsub();
  }, [firebaseReady, selected, salesmen]);

  const getTrailWithLive = (uid) => {
    const trail = trails[uid] || [];
    const salesman = salesmen.find((s) => s.uid === uid);
    if (!salesman) return trail;
    const lastPoint = trail[trail.length - 1];
    const livePoint = [salesman.lat, salesman.lng];
    if (lastPoint && (lastPoint[0] !== livePoint[0] || lastPoint[1] !== livePoint[1])) {
      return [...trail, livePoint];
    }
    return trail.length > 0 ? trail : [livePoint];
  };

  const selectSalesman = (s) => {
    setSelected(s.uid);
    setPanel(s);
    setShowList(false);
    sessionStorage.setItem('ownermap_selected', s.uid);
  };

  const clearSelection = () => {
    setSelected(null);
    setPanel(null);
    sessionStorage.removeItem('ownermap_selected');
  };

  const liveForFit = salesmen.map((s) => ({ lat: s.lat, lng: s.lng }));
  const selectedSalesman = selected ? salesmen.find((s) => s.uid === selected) : null;
  const selectedTrail = selected ? getTrailWithLive(selected) : [];

  return (
    <OwnerLayout>
      <div className="relative rounded-3xl overflow-hidden shadow-float" style={{ height: 'calc(100vh - 120px)' }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapFit live={liveForFit} />
          <ZoomToSalesman salesman={selectedSalesman} trail={selectedTrail} />

          {salesmen.map((s, i) => {
            const color = COLORS[i % COLORS.length];
            const trail = selected === s.uid ? getTrailWithLive(s.uid) : [];
            return (
              <span key={s.uid}>
                {trail.length > 1 && (
                  <>
                    <Polyline positions={trail} pathOptions={{ color, weight: 4, opacity: 0.85 }} />
                    <Marker position={trail[0]} icon={dotIcon(color, 10)} />
                  </>
                )}
                <Marker
                  position={[s.lat, s.lng]}
                  icon={markerIcon(s.name, color, selected === s.uid)}
                  eventHandlers={{ click: () => selectSalesman(s) }}
                />
              </span>
            );
          })}
        </MapContainer>

        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 z-[999] flex items-center gap-2">
          <div className="glass rounded-2xl px-3.5 py-2.5 shadow-float flex items-center gap-2.5 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">Live Map</p>
              <p className="text-[10px] text-gray-500 font-medium">
                {salesmen.length} salesman{salesmen.length !== 1 ? 'en' : ''} on duty · real-time
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowList((v) => !v)}
            className="glass rounded-2xl w-11 h-11 shadow-float flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all relative"
          >
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {salesmen.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {salesmen.length}
              </span>
            )}
          </button>
        </div>

        {/* Salesmen list dropdown */}
        {showList && (
          <div className="absolute top-16 right-3 z-[999] w-64 bg-white rounded-3xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Active Salesmen</p>
              <button onClick={() => setShowList(false)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {salesmen.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No one on duty</p>
              ) : salesmen.map((s, i) => (
                <button key={s.uid} onClick={() => selectSalesman(s)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all ${selected === s.uid ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}>
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">● On Duty</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected salesman bottom card */}
        {panel && (
          <div className="absolute bottom-3 left-3 right-3 z-[999]">
            <div className="bg-white rounded-3xl shadow-float border border-indigo-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                    {panel.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{panel.name}</p>
                    <p className="text-xs text-gray-400">{panel.phone || panel.email}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">● On Duty · {(trails[panel.uid]?.length || 0)} trail pts</p>
                  </div>
                </div>
                <button onClick={clearSelection}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="bg-indigo-50 rounded-2xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-0.5">Current Location</p>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  {panel.address || 'Waiting for location ping...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No salesmen state */}
        {salesmen.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[998] pointer-events-none">
            <div className="glass rounded-3xl px-6 py-5 text-center shadow-float">
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="text-sm font-semibold text-gray-600">No salesmen on duty</p>
              <p className="text-xs text-gray-400 mt-0.5">They'll appear here when active</p>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
