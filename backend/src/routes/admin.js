const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { hashPassword } = require('../utils/password');
const { authenticate, requireRole, clearUserCache } = require('../middleware/auth');
const { isValidEmail, isValidPassword, isNonEmptyString } = require('../utils/validate');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/owners', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0 } = req.query;
    const snap = await db.collection('users').where('role', '==', 'owner')
      .limit(Math.min(Number(limit) || 50, 100))
      .offset(Number(offset) || 0)
      .get();
    const owners = snap.docs.map((d) => {
      const { passwordHash, ...u } = { uid: d.id, ...d.data() };
      return u;
    });
    res.json({ owners });
  } catch (err) {
    console.error('Admin get owners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/owners', async (req, res) => {
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
      uid, name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role: 'owner',
      ownerId: uid, isActive: true,
      failedLoginAttempts: 0, lockedUntil: null,
      createdAt: now, updatedAt: now,
    });
    res.status(201).json({ message: 'Owner created', uid });
  } catch (err) {
    console.error('Admin create owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/owners/:uid/deactivate', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({ isActive: false, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'Owner deactivated' });
  } catch (err) {
    console.error('Admin deactivate owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/owners/:uid/activate', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({ isActive: true, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'Owner activated' });
  } catch (err) {
    console.error('Admin activate owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/owners/:uid/unblock', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({ lockedUntil: null, failedLoginAttempts: 0, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'Owner unblocked' });
  } catch (err) {
    console.error('Admin unblock owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/owners/:uid/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const db = getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists || doc.data().role !== 'owner') return res.status(404).json({ error: 'Not found' });

    const passwordHash = await hashPassword(newPassword);
    await doc.ref.update({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() });
    clearUserCache(req.params.uid);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 100, offset = 0 } = req.query;
    const snap = await db.collection('users').where('role', '==', 'salesman')
      .limit(Math.min(Number(limit) || 100, 200))
      .offset(Number(offset) || 0)
      .get();
    const live = snap.docs
      .map((d) => { const { passwordHash, ...u } = { uid: d.id, ...d.data() }; return u; })
      .filter((u) => u.liveLocation?.lat && u.liveLocation?.lng);
    res.json({ live });
  } catch (err) {
    console.error('Admin get live error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trail/:salesmanId', async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.params.salesmanId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Not found' });
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
    console.error('Admin get trail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/inventory/:ownerId', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('products').where('ownerId', '==', req.params.ownerId).get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json({ products });
  } catch (err) {
    console.error('Admin get inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
