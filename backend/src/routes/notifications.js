const express = require('express');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', authenticate, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription required' });
  const db = getDb();
  await db.collection('pushSubscriptions').doc(req.user.uid).set({
    uid: req.user.uid,
    subscription,
    updatedAt: new Date(),
  });
  res.json({ message: 'Subscribed' });
});

router.delete('/subscribe', authenticate, async (req, res) => {
  const db = getDb();
  await db.collection('pushSubscriptions').doc(req.user.uid).delete();
  res.json({ message: 'Unsubscribed' });
});

router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const snap = await db.collection('notifications').where('recipientId', '==', req.user.uid).get();
  const notifications = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  res.json({ notifications });
});

router.patch('/:id/read', authenticate, async (req, res) => {
  const db = getDb();
  const doc = await db.collection('notifications').doc(req.params.id).get();
  if (!doc.exists || doc.data().recipientId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
  await doc.ref.update({ read: true });
  res.json({ message: 'Marked as read' });
});

router.post('/read-all', authenticate, async (req, res) => {
  const db = getDb();
  const snap = await db.collection('notifications').where('recipientId', '==', req.user.uid).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
  res.json({ message: 'All marked as read' });
});

module.exports = router;
