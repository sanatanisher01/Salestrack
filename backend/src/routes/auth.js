const express = require('express');
const { getDb, getAdmin } = require('../config/firebase');
const { comparePassword, hashPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const snap = await db.collection('users').where('email', '==', email).get();
  if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });

  const doc = snap.docs[0];
  const user = { uid: doc.id, ...doc.data() };

  if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });

  if (user.lockedUntil && user.lockedUntil.toDate() > new Date()) {
    return res.status(429).json({ error: 'Account temporarily locked' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update = { failedLoginAttempts: attempts };
    if (attempts >= 5) update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await doc.ref.update(update);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await doc.ref.update({ failedLoginAttempts: 0, lockedUntil: null });

  const token = generateToken({ uid: user.uid, role: user.role });
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out' });
});

// Refresh token — issues a new token if current one is still valid
router.post('/refresh', require('../middleware/auth').authenticate, async (req, res) => {
  const token = generateToken({ uid: req.user.uid, role: req.user.role });
  const { passwordHash, ...safeUser } = req.user;
  res.json({ token, user: safeUser });
});

router.post('/change-password', require('../middleware/auth').authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });

  const db = getDb();
  const doc = await db.collection('users').doc(req.user.uid).get();
  const valid = await comparePassword(currentPassword, doc.data().passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

  const passwordHash = await hashPassword(newPassword);
  await doc.ref.update({ passwordHash, updatedAt: new Date() });
  res.json({ message: 'Password changed' });
});

router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json(safeUser);
});

router.get('/firebase-token', require('../middleware/auth').authenticate, async (req, res) => {
  const admin = getAdmin();
  const customToken = await admin.auth().createCustomToken(req.user.uid);
  res.json({ customToken });
});

module.exports = router;
