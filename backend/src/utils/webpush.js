const webpush = require('web-push');
const { getDb } = require('../config/firebase');

function initWebPush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.warn('WARNING: VAPID keys not configured. Push notifications will not work.');
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function sendPushNotification(subscription, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (err) {
      // Subscription expired or invalid — clean up from Firestore
      if (err.statusCode === 410 || err.statusCode === 404) {
        try {
          const db = getDb();
          const snap = await db.collection('pushSubscriptions')
            .where('subscription.endpoint', '==', subscription.endpoint)
            .limit(1)
            .get();
          if (!snap.empty) await snap.docs[0].ref.delete();
        } catch {}
        return false;
      }
      if (i === retries - 1) {
        console.error('Push notification failed after retries:', err.message);
        return false;
      }
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

module.exports = { initWebPush, sendPushNotification };
