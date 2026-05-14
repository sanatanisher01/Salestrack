const { verifyToken } = require('../utils/jwt');
const { getDb } = require('../config/firebase');

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    const db = getDb();
    const snap = await db.collection('users').doc(payload.uid).get();
    if (!snap.exists || !snap.data().isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = { uid: payload.uid, ...snap.data() };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
