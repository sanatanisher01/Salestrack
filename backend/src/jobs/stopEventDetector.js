const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { haversineDistance, reverseGeocode } = require('../utils/geo');
const { sendPushNotification } = require('../utils/webpush');

const STOP_RADIUS_M = 50;
const STOP_MINUTES = 5;
const MAX_SESSIONS_PER_RUN = 50; // Limit to prevent excessive reads

async function detectStops() {
  const db = getDb();
  const sessionsSnap = await db.collection('dutySessions')
    .where('status', '==', 'active')
    .limit(MAX_SESSIONS_PER_RUN)
    .get();

  for (const sessionDoc of sessionsSnap.docs) {
    try {
      const session = sessionDoc.data();
      const cutoff = new Date(Date.now() - 10 * 60 * 1000);
      const stopCutoff = new Date(Date.now() - STOP_MINUTES * 60 * 1000);

      // Only fetch recent pings
      const pingsSnap = await db.collection('locationPings')
        .where('sessionId', '==', sessionDoc.id)
        .get();

      const recentPings = pingsSnap.docs
        .map((d) => d.data())
        .filter((p) => p.timestamp?.toDate?.() >= cutoff)
        .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
      if (recentPings.length < 2) continue;

      const stopPings = recentPings.filter((p) => p.timestamp?.toDate?.() >= stopCutoff);
      if (stopPings.length < 2) continue;

      const refPing = stopPings[0];
      const allWithin = stopPings.every(
        (p) => haversineDistance(refPing.lat, refPing.lng, p.lat, p.lng) <= STOP_RADIUS_M
      );
      if (!allWithin) continue;

      // Check if stop event already exists for this session in last 10 min
      const existingSnap = await db.collection('stopEvents')
        .where('sessionId', '==', sessionDoc.id)
        .get();
      const recentStop = existingSnap.docs.find((d) => {
        const t = d.data().createdAt?.toDate?.();
        return t && t >= cutoff;
      });
      if (recentStop) continue;

      const address = await reverseGeocode(refPing.lat, refPing.lng);
      const now = new Date();
      const stopId = uuidv4();

      await db.collection('stopEvents').doc(stopId).set({
        sessionId: sessionDoc.id,
        salesmanId: session.salesmanId,
        salesmanName: session.salesmanName,
        ownerId: session.ownerId,
        lat: refPing.lat,
        lng: refPing.lng,
        address,
        startTime: stopPings[0].timestamp,
        endTime: stopPings[stopPings.length - 1].timestamp,
        resolved: false,
        createdAt: now,
      });

      const notifId = uuidv4();
      await db.collection('notifications').doc(notifId).set({
        recipientId: session.ownerId,
        recipientRole: 'owner',
        ownerId: session.ownerId,
        salesmanId: session.salesmanId,
        type: 'stop_event',
        title: 'Salesman Stopped',
        body: `${session.salesmanName} has been stationary for ${STOP_MINUTES}+ minutes`,
        read: false,
        stopId,
        createdAt: now,
      });

      const subSnap = await db.collection('pushSubscriptions').doc(session.ownerId).get();
      if (subSnap.exists) {
        const sub = subSnap.data().subscription;
        sendPushNotification(sub, {
          title: 'Salesman Stopped',
          body: `${session.salesmanName} has been stationary for ${STOP_MINUTES}+ minutes at ${address}`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error(`Stop detection error for session ${sessionDoc.id}:`, err.message);
    }
  }
}

function startStopEventDetector() {
  // Run every 2 minutes instead of every 1 minute to reduce load
  cron.schedule('*/2 * * * *', () => {
    detectStops().catch(console.error);
  });
  console.log('Stop event detector started (every 2 minutes)');
}

module.exports = { startStopEventDetector };
