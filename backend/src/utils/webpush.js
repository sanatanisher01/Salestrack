const webpush = require('web-push');

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushNotification(subscription, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) return false;
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

module.exports = { initWebPush, sendPushNotification };
