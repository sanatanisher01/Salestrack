import { useState, useRef, useEffect } from 'react';
import { useSalesmanNotificationStore } from '../store/salesmanNotificationStore';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

function timeAgo(val) {
  if (!val) return '';
  try {
    const d = val._seconds ? new Date(val._seconds * 1000) : new Date(val);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return ''; }
}

function getNotifStyle(title = '', type = '') {
  if (title.includes('confirmed') || title.includes('Confirmed'))
    return { bg: 'bg-blue-50', img: '/notif-order-confirm.png' };
  if (title.includes('delivered') || title.includes('Delivered'))
    return { bg: 'bg-emerald-50', img: '/notif-order-confirm.png' };
  if (title.includes('cancelled') || title.includes('Cancelled'))
    return { bg: 'bg-rose-50', img: '/notif-order-cancel.png' };
  if (title.includes('Order') || type === 'new_order')
    return { bg: 'bg-violet-50', img: '/notif-new-order.png' };
  return { bg: 'bg-indigo-50', img: '/notif-new-order.png' };
}

export default function SalesmanNotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount } = useSalesmanNotificationStore();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    useSalesmanNotificationStore.setState((s) => {
      const updated = s.notifications.map((n) => n.id === id ? { ...n, read: true } : n);
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    });
  };

  const markAll = async () => {
    await api.post('/notifications/read-all');
    useSalesmanNotificationStore.setState((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${open ? 'bg-indigo-50' : 'hover:bg-gray-100'}`}>
        <svg className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-indigo-600' : 'text-gray-500'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-float border border-gray-100 overflow-hidden" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Notifications</p>
                {unreadCount > 0 && <p className="text-[10px] text-indigo-500 font-semibold">{unreadCount} new</p>}
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 font-semibold bg-white px-2.5 py-1 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400 mt-0.5">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = getNotifStyle(n.title, n.type);
                return (
                  <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <img src={style.img} alt="" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
