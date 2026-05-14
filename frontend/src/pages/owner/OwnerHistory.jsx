import { useEffect, useState } from 'react';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';
import { format } from 'date-fns';

function formatDate(val) {
  if (!val) return null;
  if (val?.toDate) return format(val.toDate(), 'dd MMM, hh:mm a');
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  return format(new Date(val), 'dd MMM, hh:mm a');
}

export default function OwnerHistory() {
  const [sessions, setSessions] = useState([]);
  const [team, setTeam] = useState([]);
  const [filter, setFilter] = useState('');
  const [stopEvents, setStopEvents] = useState([]);
  const [tab, setTab] = useState('sessions');

  useEffect(() => {
    api.get('/owner/team').then(({ data }) => setTeam(data.team.filter((m) => m.role === 'salesman')));
    api.get('/owner/duty-sessions').then(({ data }) => setSessions(data.sessions));
    api.get('/owner/stop-events').then(({ data }) => setStopEvents(data.events));
  }, []);

  const filtered = filter ? sessions.filter((s) => s.salesmanId === filter) : sessions;

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500">Duty sessions and stop events</p>
      </div>

      <div className="card mb-4">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Salesmen</option>
          {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        {[['sessions', 'Sessions'], ['stops', 'Stop Events']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {s.salesmanName?.[0]?.toUpperCase()}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{s.salesmanName}</p>
                </div>
                <span className={`badge ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(s.startedAt)} → {s.endedAt ? formatDate(s.endedAt) : 'Ongoing'}</span>
                <span className="font-semibold text-blue-600">{s.totalDistanceKm?.toFixed(2)} km</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-gray-500">No sessions found</p>
          </div>
          )}
        </div>
      )}

      {tab === 'stops' && (
        <div className="space-y-3">
          {stopEvents.map((e) => (
            <div key={e.id} className="card border-l-4 border-orange-400">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                  {e.salesmanName?.[0]?.toUpperCase()}
                </div>
                <p className="font-semibold text-sm text-gray-900">{e.salesmanName}</p>
              </div>
              <p className="text-sm text-gray-600">{e.address}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(e.createdAt)}</p>
            </div>
          ))}
          {stopEvents.length === 0 && (
            <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-gray-500">No stop events</p>
          </div>
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
