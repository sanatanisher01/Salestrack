import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SalesmanLayout from '../../layouts/SalesmanLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const selfIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(79,70,229,0.5);z-index:2;"></div>
      <div style="position:absolute;inset:-8px;background:rgba(79,70,229,0.15);border-radius:50%;animation:ripple 1.8s ease-out infinite;z-index:1;"></div>
    </div>
    <style>@keyframes ripple{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapController({ position, shouldFollow }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (!position) return;
    if (!initialized.current) { map.setView(position, 16); initialized.current = true; }
    else if (shouldFollow) { map.panTo(position, { animate: true, duration: 0.5 }); }
  }, [position, shouldFollow]);
  return null;
}

// --- Service Worker communication ---
async function tellSW(type, data) {
  const reg = await navigator.serviceWorker?.ready;
  if (reg?.active) {
    reg.active.postMessage({ type, data });
  }
}

// --- Ping queue for offline ---
const PING_QUEUE_KEY = 'pending_pings';
function getPendingPings() { try { return JSON.parse(localStorage.getItem(PING_QUEUE_KEY) || '[]'); } catch { return []; } }
function savePendingPings(pings) { localStorage.setItem(PING_QUEUE_KEY, JSON.stringify(pings.slice(-100))); }
async function flushPendingPings() {
  const pings = getPendingPings();
  if (!pings.length) return;
  const remaining = [];
  for (const ping of pings) {
    try { await api.post('/location/ping', ping); }
    catch (err) { if (!err.response) remaining.push(ping); }
  }
  savePendingPings(remaining);
}
if (typeof window !== 'undefined') window.addEventListener('online', flushPendingPings);

export default function SalesmanMap() {
  const { user, token } = useAuthStore();
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [dutyStatus, setDutyStatus] = useState('off');
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(null);
  const [trail, setTrail] = useState([]);
  const [followMode, setFollowMode] = useState(true);
  const [locationBlocked, setLocationBlocked] = useState(false); // true if permission denied or unavailable
  const dutyWatchRef = useRef(null);
  const trailIntervalRef = useRef(null);
  const trailRef = useRef([]);
  const mapRef = useRef(null);
  const MIN_DISTANCE = 5;
  const lastPingTimeRef = useRef(0);
  const MIN_PING_INTERVAL = 5000;

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationBlocked(true);
      return;
    }
    // Check permission state if API available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          setLocationBlocked(true);
          return;
        }
        result.addEventListener('change', () => {
          setLocationBlocked(result.state === 'denied');
        });
      } catch {}
    }
    // Try to get a position to trigger the permission prompt
    navigator.geolocation.getCurrentPosition(
      () => setLocationBlocked(false),
      (err) => {
        if (err.code === 1) setLocationBlocked(true); // PERMISSION_DENIED
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const requestLocationPermission = () => {
    navigator.geolocation.getCurrentPosition(
      () => { setLocationBlocked(false); toast.success('Location enabled!'); },
      (err) => {
        if (err.code === 1) {
          toast.error('Location permission denied. Please enable it in your browser/phone settings.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Listen for SW messages (e.g., "End Duty" from notification)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'END_DUTY') {
        endDuty();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    api.get('/salesman/duty/status').then(({ data }) => {
      setDutyStatus(data.dutyStatus);
      if (data.dutyStatus === 'on') {
        fetchTrailFromDB();
        startDutyTracking();
        startTrailPolling();
        // Start SW background tracking
        tellSW('START_TRACKING', { apiUrl: import.meta.env.VITE_API_URL, token });
        flushPendingPings();
        requestWakeLock();
      }
    }).catch(() => {});

    // GPS watcher for display
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        setPosition(pos);
        setAccuracy(coords.accuracy);
        setSpeed(coords.speed ? Math.round(coords.speed * 3.6) : null);
        // Send position to SW so it can ping in background
        tellSW('UPDATE_POSITION', { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      stopDutyTracking();
      stopTrailPolling();
    };
  }, []);

  // Wake Lock to prevent screen/CPU sleep
  const wakeLockRef = useRef(null);
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          // Re-acquire if released (e.g., tab becomes visible again)
          if (dutyStatus === 'on') requestWakeLock();
        });
      }
    } catch {}
  };
  const releaseWakeLock = () => {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  };

  // Re-acquire wake lock when page becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && dutyStatus === 'on') {
        requestWakeLock();
        // Also re-send current position to SW
        if (position) {
          tellSW('UPDATE_POSITION', { lat: position[0], lng: position[1], accuracy });
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [dutyStatus, position]);

  const fetchTrailFromDB = async () => {
    try {
      const { data } = await api.get('/location/trail');
      if (data.trail.length > 0) { trailRef.current = data.trail; setTrail([...data.trail]); }
    } catch {}
  };

  const startTrailPolling = () => { trailIntervalRef.current = setInterval(fetchTrailFromDB, 30000); };
  const stopTrailPolling = () => { if (trailIntervalRef.current) { clearInterval(trailIntervalRef.current); trailIntervalRef.current = null; } };

  const sendPing = async (lat, lng, acc) => {
    const ping = { lat, lng, accuracy: acc };
    try {
      if (!navigator.onLine) { const p = getPendingPings(); p.push(ping); savePendingPings(p); return; }
      await api.post('/location/ping', ping);
    } catch (err) {
      if (!err.response) { const p = getPendingPings(); p.push(ping); savePendingPings(p); }
    }
  };

  const startDutyTracking = () => {
    if (!navigator.geolocation) return;
    if (dutyWatchRef.current != null) return;
    dutyWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const newPos = [coords.latitude, coords.longitude];
        const last = trailRef.current[trailRef.current.length - 1];
        if (last) {
          const dist = Math.sqrt(
            Math.pow((newPos[0] - last[0]) * 111000, 2) +
            Math.pow((newPos[1] - last[1]) * 111000 * Math.cos(last[0] * Math.PI / 180), 2)
          );
          if (dist < MIN_DISTANCE) return;
        }
        trailRef.current = [...trailRef.current, newPos];
        setTrail([...trailRef.current]);

        const now = Date.now();
        if (now - lastPingTimeRef.current < MIN_PING_INTERVAL) return;
        lastPingTimeRef.current = now;
        sendPing(coords.latitude, coords.longitude, coords.accuracy);
        // Also update SW
        tellSW('UPDATE_POSITION', { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  };

  const stopDutyTracking = () => {
    if (dutyWatchRef.current != null) { navigator.geolocation.clearWatch(dutyWatchRef.current); dutyWatchRef.current = null; }
  };

  const endDuty = async () => {
    try {
      await flushPendingPings();
      stopDutyTracking();
      stopTrailPolling();
      tellSW('STOP_TRACKING');
      releaseWakeLock();
      await api.post('/salesman/duty/stop');
      setDutyStatus('off');
      trailRef.current = [];
      setTrail([]);
      toast.success('Duty ended');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const toggleDuty = async () => {
    // Block duty start if location not available
    if (dutyStatus === 'off') {
      if (!navigator.geolocation) {
        toast.error('Location is not supported on this device');
        return;
      }
      // Check permission before starting
      const permitted = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (err) => {
            if (err.code === 1) {
              setLocationBlocked(true);
              toast.error('Please enable location permission to start duty');
            } else {
              toast.error('Could not get location. Make sure GPS is turned on.');
            }
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      if (!permitted) return;
      setLocationBlocked(false);
    }

    setLoading(true);
    try {
      if (dutyStatus === 'off') {
        await api.post('/salesman/duty/start');
        setDutyStatus('on');
        trailRef.current = [];
        setTrail([]);
        startDutyTracking();
        startTrailPolling();
        tellSW('START_TRACKING', { apiUrl: import.meta.env.VITE_API_URL, token });
        requestWakeLock();
        toast.success('Duty started!');
      } else {
        await endDuty();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecenter = useCallback(() => {
    setFollowMode(true);
    if (position && mapRef.current) { mapRef.current.setView(position, 16, { animate: true }); }
  }, [position]);

  return (
    <SalesmanLayout>
      {/* Location permission blocker */}
      {locationBlocked && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Location Required</h2>
            <p className="text-sm text-gray-500 mb-4">
              SalesTrack needs your location to track your movement while on duty. Please enable location access.
            </p>
            <div className="space-y-2">
              <button onClick={requestLocationPermission}
                className="btn-primary w-full py-3">
                Enable Location
              </button>
              <p className="text-xs text-gray-400">
                If the button doesn't work, go to your phone's <strong>Settings → Apps → Chrome → Permissions → Location</strong> and set it to "Allow"
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative rounded-3xl overflow-hidden shadow-float" style={{ height: 'calc(100vh - 148px)' }}>
        <MapContainer
          center={position || [20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          ref={mapRef}
          whenReady={(map) => { map.target.on('dragstart', () => setFollowMode(false)); }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {position && (
            <>
              <MapController position={position} shouldFollow={followMode} />
              {trail.length > 1 && (
                <>
                  <Polyline positions={trail} pathOptions={{ color: '#4f46e5', weight: 4, opacity: 0.85 }} />
                  <Marker position={trail[0]} icon={L.divIcon({ className: '', html: '<div style="width:10px;height:10px;background:#10b981;border-radius:50%;border:2px solid white;box-shadow:0 0 4px #10b98188"></div>', iconSize: [10,10], iconAnchor: [5,5] })} />
                </>
              )}
              <Marker position={position} icon={selfIcon} />
              {accuracy && accuracy < 100 && (
                <Circle center={position} radius={accuracy}
                  pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }} />
              )}
            </>
          )}
        </MapContainer>

        {/* Top pill */}
        <div className="absolute top-3 left-3 right-3 z-[999] flex items-center justify-between gap-2">
          <div className="glass rounded-2xl px-3.5 py-2.5 shadow-float flex items-center gap-2.5 flex-1">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dutyStatus === 'on' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className={`text-[10px] font-semibold ${dutyStatus === 'on' ? 'text-emerald-600' : 'text-gray-400'}`}>
                {dutyStatus === 'on' ? `Tracking · ${trail.length} pts` : 'Off duty'}
              </p>
            </div>
          </div>
          <div className="glass rounded-2xl px-3 py-2.5 shadow-float text-center">
            {speed !== null ? (
              <><p className="text-sm font-bold text-gray-900">{speed}</p><p className="text-[9px] text-gray-400 font-semibold">km/h</p></>
            ) : accuracy ? (
              <><p className="text-sm font-bold text-gray-900">±{Math.round(accuracy)}</p><p className="text-[9px] text-gray-400 font-semibold">meters</p></>
            ) : (
              <p className="text-xs text-gray-400">GPS...</p>
            )}
          </div>
        </div>

        {/* Recenter */}
        <button onClick={handleRecenter}
          className={`absolute bottom-24 right-3 z-[999] w-11 h-11 glass rounded-2xl shadow-float flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all ${!followMode ? 'ring-2 ring-indigo-400' : ''}`}>
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Duty button */}
        <div className="absolute bottom-3 left-3 right-3 z-[999]">
          <button onClick={toggleDuty} disabled={loading}
            className={`w-full py-4 rounded-2xl text-white text-sm font-bold shadow-float transition-all active:scale-[0.98] disabled:opacity-60 ${dutyStatus === 'on' ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'}`}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Processing...
              </span>
            ) : dutyStatus === 'on' ? 'End Duty' : 'Start Duty'}
          </button>
        </div>
      </div>
    </SalesmanLayout>
  );
}
