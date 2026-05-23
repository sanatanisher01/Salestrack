const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { haversineDistance } = require('../utils/geo');
const https = require('https');

function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    https.get(url, { headers: { 'User-Agent': 'SalesTrack/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const a = json.address || {};
          // Build readable address: colony → road → suburb → city → state → postcode
          const parts = [
            a.neighbourhood || a.suburb || a.quarter || a.hamlet,
            a.road || a.pedestrian || a.footway,
            a.village || a.town || a.city_district,
            a.city || a.county,
            a.state,
            a.postcode,
          ].filter(Boolean);
          resolve(parts.length ? parts.join(', ') : (json.display_name || null));
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

const router = express.Router();
router.use(authenticate);

router.post('/ping', requireRole('salesman'), async (req, res) => {
  const { lat, lng, accuracy } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

  const db = getDb();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const { activeSessionId, ownerId } = userDoc.data();
  if (!activeSessionId) return res.status(400).json({ error: 'Not on duty' });

  const now = new Date();
  const pingId = uuidv4();
  await db.collection('locationPings').doc(pingId).set({
    salesmanId: req.user.uid,
    salesmanName: req.user.name,
    ownerId,
    sessionId: activeSessionId,
    lat, lng, accuracy: accuracy || null,
    timestamp: now,
  });

  // Reverse geocode (non-blocking — don't await)
  reverseGeocode(lat, lng).then((address) => {
    db.collection('users').doc(req.user.uid).update({
      liveLocation: { lat, lng, timestamp: now, address: address || null },
      updatedAt: now,
    }).catch(() => {});
  });

  // Update live location immediately without waiting for geocode
  await db.collection('users').doc(req.user.uid).update({
    'liveLocation.lat': lat,
    'liveLocation.lng': lng,
    'liveLocation.timestamp': now,
    updatedAt: now,
  });

  // Update session distance incrementally (only last 2 pings)
  const lastPingsSnap = await db.collection('locationPings')
    .where('sessionId', '==', activeSessionId)
    .orderBy('timestamp', 'desc')
    .limit(2)
    .get();
  if (lastPingsSnap.size === 2) {
    const [p1, p2] = lastPingsSnap.docs.map(d => d.data());
    const dist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng) / 1000;
    const sessionDoc = await db.collection('dutySessions').doc(activeSessionId).get();
    const current = sessionDoc.data()?.totalDistanceKm || 0;
    await db.collection('dutySessions').doc(activeSessionId).update({ totalDistanceKm: current + dist });
  }

  res.json({ message: 'Ping recorded' });
});

router.get('/live', requireRole('owner'), async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').where('ownerId', '==', req.user.uid).get();
  const live = snap.docs
    .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
    .filter((u) => u.role === 'salesman' && u.liveLocation);
  res.json({ live });
});

router.get('/trail', requireRole('salesman'), async (req, res) => {
  const db = getDb();
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const { activeSessionId } = userDoc.data();
  if (!activeSessionId) return res.json({ trail: [] });
  const snap = await db.collection('locationPings').where('sessionId', '==', activeSessionId).get();
  const trail = snap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0))
    .map((p) => [p.lat, p.lng]);
  res.json({ trail });
});

module.exports = router;
