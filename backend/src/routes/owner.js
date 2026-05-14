const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { hashPassword } = require('../utils/password');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('owner'));

router.get('/team', async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').where('ownerId', '==', req.user.uid).get();
  const team = snap.docs
    .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
    .filter((u) => u.role !== 'owner');
  res.json({ team });
});

router.post('/team/salesman', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const db = getDb();
  const existing = await db.collection('users').where('email', '==', email).get();
  if (!existing.empty) return res.status(409).json({ error: 'Email already exists' });

  const uid = uuidv4();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db.collection('users').doc(uid).set({
    uid, name, email, phone: phone || '', passwordHash,
    role: 'salesman', ownerId: req.user.uid, isActive: true,
    dutyStatus: 'off', activeSessionId: null, liveLocation: null,
    failedLoginAttempts: 0, lockedUntil: null,
    createdAt: now, updatedAt: now,
  });
  res.status(201).json({ message: 'Salesman created', uid });
});

router.post('/team/accountant', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const db = getDb();
  const existing = await db.collection('users').where('email', '==', email).get();
  if (!existing.empty) return res.status(409).json({ error: 'Email already exists' });

  const uid = uuidv4();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db.collection('users').doc(uid).set({
    uid, name, email, passwordHash,
    role: 'accountant', ownerId: req.user.uid, isActive: true,
    failedLoginAttempts: 0, lockedUntil: null,
    createdAt: now, updatedAt: now,
  });
  res.status(201).json({ message: 'Accountant created', uid });
});

router.patch('/team/:uid/deactivate', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('users').doc(req.params.uid).get();
  if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
  await doc.ref.update({ isActive: false, updatedAt: new Date() });
  res.json({ message: 'User deactivated' });
});

router.patch('/team/:uid/activate', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('users').doc(req.params.uid).get();
  if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
  await doc.ref.update({ isActive: true, updatedAt: new Date() });
  res.json({ message: 'User activated' });
});

router.get('/duty-sessions', async (req, res) => {
  const { salesmanId, status } = req.query;
  const db = getDb();
  const snap = await db.collection('dutySessions').where('ownerId', '==', req.user.uid).get();
  let sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (salesmanId) sessions = sessions.filter((s) => s.salesmanId === salesmanId);
  if (status) sessions = sessions.filter((s) => s.status === status);
  sessions.sort((a, b) => (b.startedAt?.toMillis?.() || 0) - (a.startedAt?.toMillis?.() || 0));
  res.json({ sessions });
});

router.get('/duty-sessions/:id/trail', async (req, res) => {
  const db = getDb();
  const session = await db.collection('dutySessions').doc(req.params.id).get();
  if (!session.exists || session.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });

  const snap = await db.collection('locationPings').where('sessionId', '==', req.params.id).get();
  const trail = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
  res.json({ trail });
});

router.get('/stop-events', async (req, res) => {
  const db = getDb();
  const snap = await db.collection('stopEvents').where('ownerId', '==', req.user.uid).get();
  const events = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  res.json({ events });
});

module.exports = router;
