import { useEffect, useRef } from 'react';
import api from '../api/axios';

const SUBSCRIBED_KEY = 'JDM-push-subscribed';

export function usePushNotifications() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Don't re-subscribe if already done in this session
    if (sessionStorage.getItem(SUBSCRIBED_KEY)) return;

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        sessionStorage.setItem(SUBSCRIBED_KEY, '1');
        return;
      }

      try {
        const { data } = await api.get('/notifications/vapid-public-key');
        if (!data.publicKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
        await api.post('/notifications/subscribe', { subscription: sub });
        sessionStorage.setItem(SUBSCRIBED_KEY, '1');
      } catch {}
    }).catch(() => {});
  }, []);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
