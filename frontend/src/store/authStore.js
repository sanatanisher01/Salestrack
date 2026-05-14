import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';
import { signInToFirebase, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

let refreshTimer = null;

function scheduleRefresh(get) {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    const { token } = get();
    if (!token) return;
    try {
      const { data } = await api.post('/auth/refresh');
      get().setToken(data.token, data.user);
    } catch {
      get().logout();
    }
  }, 20 * 60 * 1000); // every 20 minutes
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
      },

      hydrate: async () => {
        const { token, user } = get();
        if (!token || !user) return;
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
          await get().initFirebase();
          scheduleRefresh(get);
        } catch {
          set({ user: null, token: null, firebaseReady: false });
        }
      },
    }),
    { name: 'salestrack-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
