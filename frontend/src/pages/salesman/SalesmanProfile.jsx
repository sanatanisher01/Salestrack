import SalesmanLayout from '../../layouts/SalesmanLayout';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import IOSInstallGuide from '../../components/IOSInstallGuide';

export default function SalesmanProfile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [changing, setChanging] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', form);
      toast.success('Password changed');
      setChanging(false);
      setForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SalesmanLayout>
      {/* Avatar hero */}
      <div className="flex flex-col items-center py-8 mb-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200 mb-3">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-sm text-gray-400">{user?.email}</p>
        {user?.phone && <p className="text-sm text-gray-400">{user.phone}</p>}
        <span className="mt-2 badge bg-indigo-100 text-indigo-700">Salesman</span>
      </div>

      <div className="space-y-3">
        {/* Install App */}
        {isInstalled ? (
          <div className="card flex items-center gap-3 border border-emerald-100 bg-emerald-50/50">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-emerald-700">App Installed</p>
              <p className="text-xs text-gray-400">SalesTrack is on your home screen</p>
            </div>
          </div>
        ) : (
          <button onClick={canInstall ? install : () => setShowIOS(true)}
            className="card w-full flex items-center gap-3 hover:bg-indigo-50 transition-colors border border-indigo-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-indigo-700">Install App</p>
              <p className="text-xs text-gray-400">Add SalesTrack to your home screen</p>
            </div>
          </button>
        )}
        {/* Change password */}
        <div className="card">
          <button onClick={() => setChanging(!changing)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              <p className="font-semibold text-sm text-gray-800">Change Password</p>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${changing ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {changing && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 pt-4 border-t border-gray-50">
              <input className="input" type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
              <input className="input" type="password" placeholder="New password (min 8 chars)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={8} />
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Update Password'}</button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="card w-full flex items-center gap-3 hover:bg-rose-50 transition-colors border-rose-100">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
          <p className="font-semibold text-sm text-rose-600">Logout</p>
        </button>
      </div>

      {showIOS && <IOSInstallGuide onClose={() => setShowIOS(false)} />}
    </SalesmanLayout>
  );
}
