import { create } from 'zustand';
import api from '../api/axios';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  _interval: null,

  init: (uid) => {
    get().cleanup();
    const fetch = async () => {
      try {
        const { data } = await api.get('/notifications');
        set({ notifications: data.notifications, unreadCount: data.notifications.filter((n) => !n.read).length });
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 60000); // every 60 seconds
    set({ _interval: interval });
  },

  cleanup: () => {
    const { _interval } = get();
    if (_interval) clearInterval(_interval);
    set({ _interval: null, notifications: [], unreadCount: 0 });
  },
}));
