const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey });
});

router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Valid subscription required' });
    const db = getDb();
    await db.collection('pushSubscriptions').doc(req.user.uid).set({
      uid: req.user.uid,
      subscription,
      updatedAt: new Date(),
    });
    res.json({ message: 'Subscribed' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subscribe', authenticate, async (req, res) => {
  try {
    const db = getDb();
    await db.collection('pushSubscriptions').doc(req.user.uid).delete();
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDb();
    const snap = await db.collection('notifications')
      .where('recipientId', '==', req.user.uid)
      .get();
    let notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifications.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    notifications = notifications.slice(Number(offset) || 0, (Number(offset) || 0) + Math.min(Number(limit) || 50, 100));
    res.json({ notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('notifications').doc(req.params.id).get();
    if (!doc.exists || doc.data().recipientId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
    await doc.ref.update({ read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/read-all', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('notifications')
      .where('recipientId', '==', req.user.uid)
      .get();
    const unread = snap.docs.filter((d) => !d.data().read);
    if (unread.length === 0) return res.json({ message: 'No unread notifications' });
    const batch = db.batch();
    unread.slice(0, 500).forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
