const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { hashPassword } = require('../utils/password');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/owners', async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').where('role', '==', 'owner').get();
  const owners = snap.docs.map((d) => {
    const { passwordHash, ...u } = { uid: d.id, ...d.data() };
    return u;
  });
  res.json({ owners });
});

router.post('/owners', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const db = getDb();
  const existing = await db.collection('users').where('email', '==', email).get();
  if (!existing.empty) return res.status(409).json({ error: 'Email already exists' });

  const uid = uuidv4();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db.collection('users').doc(uid).set({
    uid, name, email, passwordHash, role: 'owner',
    ownerId: uid, isActive: true,
    failedLoginAttempts: 0, lockedUntil: null,
    createdAt: now, updatedAt: now,
  });
  res.status(201).json({ message: 'Owner created', uid });
});

router.patch('/owners/:uid/deactivate', async (req, res) => {
  const db = getDb();
  await db.collection('users').doc(req.params.uid).update({ isActive: false, updatedAt: new Date() });
  res.json({ message: 'Owner deactivated' });
});

router.patch('/owners/:uid/activate', async (req, res) => {
  const db = getDb();
  await db.collection('users').doc(req.params.uid).update({ isActive: true, updatedAt: new Date() });
  res.json({ message: 'Owner activated' });
});

router.get('/live', async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').where('role', '==', 'salesman').get();
  const live = snap.docs
    .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
    .filter((u) => u.liveLocation?.lat && u.liveLocation?.lng);
  res.json({ live });
});

router.get('/trail/:salesmanId', async (req, res) => {
  const db = getDb();
  const userDoc = await db.collection('users').doc(req.params.salesmanId).get();
  if (!userDoc.exists) return res.status(404).json({ error: 'Not found' });
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
