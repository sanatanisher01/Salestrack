const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { hashPassword } = require('../utils/password');
const { authenticate, requireRole, clearUserCache } = require('../middleware/auth');
const { isValidEmail, isValidPassword, isNonEmptyString } = require('../utils/validate');

const router = express.Router();
router.use(authenticate, requireRole('owner'));

router.get('/team', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('users').where('ownerId', '==', req.user.uid).get();
    const team = snap.docs
      .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
      .filter((u) => u.role !== 'owner');
    res.json({ team });
  } catch (err) {
    console.error('Owner get team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/team/salesman', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'Name is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const db = getDb();
    const existing = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();
    if (!existing.empty) return res.status(409).json({ error: 'Email already exists' });

    const uid = uuidv4();
    const passwordHash = await hashPassword(password);
    const now = new Date();
    await db.collection('users').doc(uid).set({
      uid, name: name.trim(), email: email.toLowerCase().trim(), phone: phone?.trim() || '', passwordHash,
      role: 'salesman', ownerId: req.user.uid, isActive: true,
      dutyStatus: 'off', activeSessionId: null, liveLocation: null,
      failedLoginAttempts: 0, lockedUntil: null,
      createdAt: now, updatedAt: now,
    });
    res.status(201).json({ message: 'Salesman created', uid });
  } catch (err) {
    console.error('Owner create salesman error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/team/accountant', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'Name is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const db = getDb();
    const existing = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();
    if (!existing.empty) return res.status(409).json({ error: 'Email already exists' });

    const uid = uuidv4();
    const passwordHash = await hashPassword(password);
    const now = new Date();
    await db.collection('users').doc(uid).set({
      uid, name: name.trim(), email: email.toLowerCase().trim(), passwordHash,
      role: 'accountant', ownerId: req.user.uid, isActive: true,
      failedLoginAttempts: 0, lockedUntil: null,
      createdAt: now, updatedAt: now,
    });
    res.status(201).json({ message: 'Accountant created', uid });
  } catch (err) {
    console.error('Owner create accountant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/team/:uid/deactivate', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
    await doc.ref.update({ isActive: false, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error('Owner deactivate member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/team/:uid/activate', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
    await doc.ref.update({ isActive: true, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'User activated' });
  } catch (err) {
    console.error('Owner activate member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/team/:uid/unblock', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
    await doc.ref.update({ lockedUntil: null, failedLoginAttempts: 0, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error('Owner unblock member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/team/:uid', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });
    if (doc.data().dutyStatus === 'on') return res.status(400).json({ error: 'Cannot delete a salesman who is on duty' });
    await doc.ref.delete();
    clearUserCache(req.params.uid);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Owner delete member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/duty-sessions', async (req, res) => {
  try {
    const { salesmanId, status, limit = 50, offset = 0 } = req.query;
    const db = getDb();
    let query = db.collection('dutySessions').where('ownerId', '==', req.user.uid);
    if (salesmanId) query = query.where('salesmanId', '==', salesmanId);
    if (status) query = query.where('status', '==', status);
    const snap = await query
      .orderBy('startedAt', 'desc')
      .limit(Math.min(Number(limit) || 50, 100))
      .offset(Number(offset) || 0)
      .get();
    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ sessions });
  } catch (err) {
    console.error('Owner get duty sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/duty-sessions/:id/trail', async (req, res) => {
  try {
    const db = getDb();
    const session = await db.collection('dutySessions').doc(req.params.id).get();
    if (!session.exists || session.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });

    const snap = await db.collection('locationPings')
      .where('sessionId', '==', req.params.id)
      .orderBy('timestamp', 'asc')
      .limit(1000)
      .get();
    const trail = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, lat: data.lat, lng: data.lng, timestamp: data.timestamp };
    });
    res.json({ trail });
  } catch (err) {
    console.error('Owner get trail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stop-events', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDb();
    const snap = await db.collection('stopEvents')
      .where('ownerId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(Math.min(Number(limit) || 50, 100))
      .offset(Number(offset) || 0)
      .get();
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ events });
  } catch (err) {
    console.error('Owner get stop events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
