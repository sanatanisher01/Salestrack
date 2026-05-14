const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

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
      const { sendPushNotification } = require('../utils/webpush');
      await sendPushNotification(subDoc.data().subscription, { title, body }).catch(() => {});
    }
  } catch {}
}

router.post('/duty/start', async (req, res) => {
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
});

router.post('/duty/stop', async (req, res) => {
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
});

router.get('/duty/status', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('users').doc(req.user.uid).get();
  const { dutyStatus, activeSessionId } = doc.data();
  res.json({ dutyStatus, activeSessionId });
});

router.get('/orders', async (req, res) => {
  const db = getDb();
  const snap = await db.collection('orders').where('salesmanId', '==', req.user.uid).get();
  const orders = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  res.json({ orders });
});

module.exports = router;
