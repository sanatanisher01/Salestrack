import { create } from 'zustand';
import api from '../api/axios';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  _interval: null,

  init: (uid) => {
    get().cleanup();
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        set({ notifications: data.notifications, unreadCount: data.notifications.filter((n) => !n.read).length });
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    set({ _interval: interval });
  },

  markRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        unreadCount: state.notifications.filter((n) => !n.read && n.id !== id).length,
      }));
    } catch {}
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {}
  },

  cleanup: () => {
    const { _interval } = get();
    if (_interval) clearInterval(_interval);
    set({ _interval: null, notifications: [], unreadCount: 0 });
  },
}));
