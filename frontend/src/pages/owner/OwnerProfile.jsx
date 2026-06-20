import OwnerLayout from '../../layouts/OwnerLayout';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import api from '../../api/axios';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import IOSInstallGuide from '../../components/IOSInstallGuide';

export default function OwnerProfile() {
  const { user, logout } = useAuthStore();
  const { cleanup } = useNotificationStore();
  const navigate = useNavigate();
  const [changing, setChanging] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const [customerCode, setCustomerCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => {
    api.get('/owner/customer-code').then(({ data }) => setCustomerCode(data.code || '')).catch(() => {});
  }, []);

  const saveCustomerCode = async () => {
    if (!codeInput.trim() || codeInput.trim().length < 4) {
      toast.error('Code must be at least 4 characters');
      return;
    }
    setSavingCode(true);
    try {
      const { data } = await api.post('/owner/customer-code', { code: codeInput.trim().toUpperCase() });
      setCustomerCode(data.code);
      setCodeInput('');
      toast.success('Supplier code saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSavingCode(false);
    }
  };

  const copyCode = () => {
    const code = customerCode || user?.uid;
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const handleLogout = async () => {
    cleanup();
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
    <OwnerLayout>
      {/* Avatar hero */}
      <div className="flex flex-col items-center py-8 mb-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200 mb-3">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-sm text-gray-400">{user?.email}</p>
        <span className="mt-2 badge bg-indigo-100 text-indigo-700">Owner</span>
      </div>

      <div className="space-y-3">
        {/* Install App */}
        {isInstalled ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 border border-emerald-100 bg-emerald-50/50">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-emerald-700">App Installed</p>
              <p className="text-xs text-gray-400">JDM is on your home screen</p>
            </div>
          </div>
        ) : (
          <button onClick={canInstall ? install : () => setShowIOS(true)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 w-full flex items-center gap-3 hover:bg-indigo-50 transition-colors border border-indigo-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-indigo-700">Install App</p>
              <p className="text-xs text-gray-400">Add JDM to your home screen</p>
            </div>
          </button>
        )}

        {/* Supplier Code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">Supplier Code</p>
              <p className="text-xs text-gray-400">Share this with your customers to link them</p>
            </div>
          </div>
          {customerCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-emerald-50 rounded-xl px-4 py-3 text-center">
                <p className="text-lg font-bold text-emerald-700 tracking-widest">{customerCode}</p>
              </div>
              <button onClick={copyCode} className="px-3 py-3 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-2">Your default code is your ID. Set a custom easy-to-share code:</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-xs text-gray-400">Default (your ID)</p>
                  <p className="text-sm font-mono text-gray-600 truncate">{user?.uid}</p>
                </div>
                <button onClick={copyCode} className="px-3 py-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <div className="flex gap-2">
                <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors flex-1" placeholder="e.g. ARYAN2024" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={20} />
                <button onClick={saveCustomerCode} disabled={savingCode} className="bg-[#0F172A] text-white font-bold rounded-xl active:scale-95 transition-transform px-4 text-sm">
                  {savingCode ? '...' : 'Set'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <button onClick={() => setChanging(!changing)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="font-semibold text-sm text-gray-800">Change Password</p>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${changing ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {changing && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 pt-4 border-t border-gray-50">
              <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
              <input className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#0F172A] transition-colors" type="password" placeholder="New password (min 8 chars)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={8} />
              <button type="submit" disabled={loading} className="bg-[#0F172A] text-white font-bold rounded-xl active:scale-95 transition-transform w-full">{loading ? 'Saving...' : 'Update Password'}</button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 w-full flex items-center gap-3 hover:bg-rose-50 transition-colors border border-rose-100">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <p className="font-semibold text-sm text-rose-600">Logout</p>
        </button>
      </div>

      {showIOS && <IOSInstallGuide onClose={() => setShowIOS(false)} />}
    </OwnerLayout>
  );
}
