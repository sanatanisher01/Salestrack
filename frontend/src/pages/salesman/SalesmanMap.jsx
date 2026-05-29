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
    if (!initialized.current) {
      map.setView(position, 16);
      initialized.current = true;
    } else if (shouldFollow) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [position, shouldFollow]);

  return null;
}

export default function SalesmanMap() {
  const { user } = useAuthStore();
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [dutyStatus, setDutyStatus] = useState('off');
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(null);
  const [trail, setTrail] = useState([]);
  const [followMode, setFollowMode] = useState(true); // auto-follow GPS
  const dutyWatchRef = useRef(null);
  const trailIntervalRef = useRef(null);
  const trailRef = useRef([]);
  const mapRef = useRef(null);
  const MIN_DISTANCE = 5; // meters

  useEffect(() => {
    api.get('/salesman/duty/status').then(({ data }) => {
      setDutyStatus(data.dutyStatus);
      if (data.dutyStatus === 'on') {
        fetchTrailFromDB();
        startDutyTracking(); // Start tracking if already on duty
        startTrailPolling();
      }
    }).catch(() => {});

    // GPS watcher for display only (position dot on map)
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setAccuracy(coords.accuracy);
        setSpeed(coords.speed ? Math.round(coords.speed * 3.6) : null);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      stopDutyTracking();
      stopTrailPolling();
    };
  }, []);

  const fetchTrailFromDB = async () => {
    try {
      const { data } = await api.get('/location/trail');
      if (data.trail.length > 0) {
        trailRef.current = data.trail;
        setTrail([...data.trail]);
      }
    } catch {}
  };

  const startTrailPolling = () => {
    trailIntervalRef.current = setInterval(fetchTrailFromDB, 30000);
  };

  const stopTrailPolling = () => {
    if (trailIntervalRef.current) { clearInterval(trailIntervalRef.current); trailIntervalRef.current = null; }
  };

  const startDutyTracking = () => {
    if (!navigator.geolocation) return;
    if (dutyWatchRef.current != null) return; // Already tracking
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
        api.post('/location/ping', { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const stopDutyTracking = () => {
    if (dutyWatchRef.current != null) {
      navigator.geolocation.clearWatch(dutyWatchRef.current);
      dutyWatchRef.current = null;
    }
  };

  const toggleDuty = async () => {
    setLoading(true);
    try {
      if (dutyStatus === 'off') {
        await api.post('/salesman/duty/start');
        setDutyStatus('on');
        trailRef.current = [];
        setTrail([]);
        startDutyTracking();
        startTrailPolling();
        toast.success('Duty started!');
      } else {
        stopDutyTracking();
        stopTrailPolling();
        await api.post('/salesman/duty/stop');
        setDutyStatus('off');
        trailRef.current = [];
        setTrail([]);
        toast.success('Duty ended');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecenter = useCallback(() => {
    setFollowMode(true);
    if (position && mapRef.current) {
      mapRef.current.setView(position, 16, { animate: true });
    }
  }, [position]);

  return (
    <SalesmanLayout>
      <div className="relative rounded-3xl overflow-hidden shadow-float" style={{ height: 'calc(100vh - 148px)' }}>
        <MapContainer
          center={position || [20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          ref={mapRef}
          whenReady={(map) => {
            // Disable follow when user drags
            map.target.on('dragstart', () => setFollowMode(false));
          }}
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
              <>
                <p className="text-sm font-bold text-gray-900">{speed}</p>
                <p className="text-[9px] text-gray-400 font-semibold">km/h</p>
              </>
            ) : accuracy ? (
              <>
                <p className="text-sm font-bold text-gray-900">±{Math.round(accuracy)}</p>
                <p className="text-[9px] text-gray-400 font-semibold">meters</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">GPS...</p>
            )}
          </div>
        </div>

        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className={`absolute bottom-24 right-3 z-[999] w-11 h-11 glass rounded-2xl shadow-float flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all ${!followMode ? 'ring-2 ring-indigo-400' : ''}`}
        >
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Duty button */}
        <div className="absolute bottom-3 left-3 right-3 z-[999]">
          <button
            onClick={toggleDuty}
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white text-sm font-bold shadow-float transition-all active:scale-[0.98] disabled:opacity-60 ${
              dutyStatus === 'on'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Processing...
              </span>
            ) : dutyStatus === 'on' ? 'End Duty' : 'Start Duty'}
          </button>
        </div>
      </div>
    </SalesmanLayout>
  );
}
