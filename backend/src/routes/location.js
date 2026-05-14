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

  // Reverse geocode (non-blocking)
  const address = await reverseGeocode(lat, lng);

  // Update live location on user doc
  await db.collection('users').doc(req.user.uid).update({
    liveLocation: { lat, lng, timestamp: now, address: address || null },
    updatedAt: now,
  });

  // Update session distance
  const pingsSnap = await db.collection('locationPings').where('sessionId', '==', activeSessionId).get();
  const pings = pingsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));

  let totalDistanceKm = 0;
  for (let i = 1; i < pings.length; i++) {
    totalDistanceKm += haversineDistance(pings[i - 1].lat, pings[i - 1].lng, pings[i].lat, pings[i].lng) / 1000;
  }
  await db.collection('dutySessions').doc(activeSessionId).update({ totalDistanceKm });

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
