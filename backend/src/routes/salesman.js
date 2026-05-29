const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/webpush');

const router = express.Router();
router.use(authenticate, requireRole('salesman'));

async function notifyOwner(db, ownerId, title, body) {
  try {
    const notifId = uuidv4();
    await db.collection('notifications').doc(notifId).set({
      recipientId: ownerId, title, body, read: false, createdAt: new Date(),
    });
    const subDoc = await db.collection('pushSubscriptions').doc(ownerId).get();
    if (subDoc.exists) {
      await sendPushNotification(subDoc.data().subscription, { title, body });
    }
  } catch (err) {
    console.error('Notify owner error:', err.message);
  }
}

router.post('/duty/start', async (req, res) => {
  try {
    const db = getDb();
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    if (userDoc.data().dutyStatus === 'on') return res.status(400).json({ error: 'Already on duty' });

    const sessionId = uuidv4();
    const now = new Date();
    await db.collection('dutySessions').doc(sessionId).set({
      salesmanId: req.user.uid,
      salesmanName: req.user.name,
      ownerId: req.user.ownerId,
      status: 'active',
      startedAt: now,
      endedAt: null,
      totalDistanceKm: 0,
    });
    await userRef.update({ dutyStatus: 'on', activeSessionId: sessionId, updatedAt: now });
    if (req.user.ownerId) {
      await notifyOwner(db, req.user.ownerId, '🟢 Salesman Online', `${req.user.name} has started duty`);
    }
    res.json({ message: 'Duty started', sessionId });
  } catch (err) {
    console.error('Duty start error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/duty/stop', async (req, res) => {
  try {
    const db = getDb();
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    const { activeSessionId } = userDoc.data();
    if (!activeSessionId) return res.status(400).json({ error: 'Not on duty' });

    const now = new Date();
    await db.collection('dutySessions').doc(activeSessionId).update({ status: 'completed', endedAt: now });
    await userRef.update({ dutyStatus: 'off', activeSessionId: null, liveLocation: null, updatedAt: now });
    if (req.user.ownerId) {
      await notifyOwner(db, req.user.ownerId, '🔴 Salesman Offline', `${req.user.name} has ended duty`);
    }
    res.json({ message: 'Duty stopped' });
  } catch (err) {
    console.error('Duty stop error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/duty/status', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.user.uid).get();
    const { dutyStatus, activeSessionId } = doc.data();
    res.json({ dutyStatus, activeSessionId });
  } catch (err) {
    console.error('Duty status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDb();
    const snap = await db.collection('orders')
      .where('salesmanId', '==', req.user.uid)
      .get();
    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    orders = orders.slice(Number(offset) || 0, (Number(offset) || 0) + Math.min(Number(limit) || 50, 100));
    res.json({ orders });
  } catch (err) {
    console.error('Salesman get orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
