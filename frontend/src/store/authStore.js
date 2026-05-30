import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';
import { signInToFirebase, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

let refreshTimer = null;

function scheduleRefresh(get) {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    const { token, user } = get();
    if (!token) return;
    // Don't refresh for customers (they use Firebase auth directly)
    if (user?.role === 'customer') return;
    try {
      const { data } = await api.post('/auth/refresh');
      get().setToken(data.token, data.user);
    } catch {
      get().logout();
    }
  }, 45 * 60 * 1000);
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      firebaseReady: false,

      setToken: (token, user) => set({ token, user }),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.token });
        await get().initFirebase();
        scheduleRefresh(get);
        return data.user;
      },

      initFirebase: async () => {
        try {
          const { user } = get();
          // Customers are already signed into Firebase via Google
          if (user?.role === 'customer') {
            set({ firebaseReady: true });
            return;
          }
          const { data } = await api.get('/auth/firebase-token');
          await signInToFirebase(data.customToken);
          set({ firebaseReady: true });
        } catch {
          set({ firebaseReady: false });
        }
      },

      logout: async () => {
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        try { await api.post('/auth/logout'); } catch {}
        try { await signOut(auth); } catch {}
        set({ user: null, token: null, firebaseReady: false });
        sessionStorage.removeItem('JDM-push-subscribed');
      },

      hydrate: async () => {
        const { token, user } = get();
        if (!token || !user) return;
        try {
          if (user.role === 'customer') {
            // For customers, verify via customer endpoint
            try {
              const { data } = await api.get('/customer/me');
              set({ user: { uid: data.uid, name: data.shopName || data.ownerName, email: data.email, role: 'customer' }, firebaseReady: true });
            } catch {
              // If /customer/me fails, keep existing user data (might be freshly registered)
              // Only logout if token is truly invalid (handled by interceptor)
              set({ firebaseReady: true });
            }
          } else {
            const { data } = await api.get('/auth/me');
            set({ user: data });
            await get().initFirebase();
          }
          scheduleRefresh(get);
        } catch {
          set({ user: null, token: null, firebaseReady: false });
        }
      },
    }),
    { name: 'JDM-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
