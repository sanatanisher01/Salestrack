const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { haversineDistance, reverseGeocode } = require('../utils/geo');
const { isValidLat, isValidLng } = require('../utils/validate');

const router = express.Router();
router.use(authenticate);

router.post('/ping', requireRole('salesman'), async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    if (!isValidLat(Number(lat)) || !isValidLng(Number(lng))) {
      return res.status(400).json({ error: 'Valid lat (-90 to 90) and lng (-180 to 180) required' });
    }

    const numLat = Number(lat);
    const numLng = Number(lng);
    const numAccuracy = accuracy != null ? Number(accuracy) : null;

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
      lat: numLat, lng: numLng, accuracy: numAccuracy,
      timestamp: now,
    });

    // Update live location immediately (address will be updated async)
    await db.collection('users').doc(req.user.uid).update({
      liveLocation: { lat: numLat, lng: numLng, timestamp: now, address: null },
      updatedAt: now,
    });

    // Reverse geocode in background — updates address field only
    reverseGeocode(numLat, numLng).then((address) => {
      db.collection('users').doc(req.user.uid).update({
        'liveLocation.address': address,
      }).catch(() => {});
    });

    // Update session distance incrementally (only last 2 pings)
    const lastPingsSnap = await db.collection('locationPings')
      .where('sessionId', '==', activeSessionId)
      .get();
    const lastPings = lastPingsSnap.docs
      .map(d => d.data())
      .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
      .slice(0, 2);
    if (lastPings.length === 2) {
      const [p1, p2] = lastPings;
      const dist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng) / 1000;
      if (dist > 0.001) { // Only update if moved more than 1 meter
        const sessionDoc = await db.collection('dutySessions').doc(activeSessionId).get();
        const current = sessionDoc.data()?.totalDistanceKm || 0;
        await db.collection('dutySessions').doc(activeSessionId).update({ totalDistanceKm: current + dist });
      }
    }

    res.json({ message: 'Ping recorded' });
  } catch (err) {
    console.error('Location ping error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live', requireRole('owner'), async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('users').where('ownerId', '==', req.user.uid).get();
    const live = snap.docs
      .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
      .filter((u) => u.role === 'salesman' && u.liveLocation);
    res.json({ live });
  } catch (err) {
    console.error('Get live location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trail', requireRole('salesman'), async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const { activeSessionId } = userDoc.data();
    if (!activeSessionId) return res.json({ trail: [] });
    const snap = await db.collection('locationPings')
      .where('sessionId', '==', activeSessionId)
      .get();
    const trail = snap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0))
      .map((p) => [p.lat, p.lng]);
    res.json({ trail });
  } catch (err) {
    console.error('Get trail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
