const { verifyToken } = require('../utils/jwt');
const { getDb } = require('../config/firebase');

// In-memory cache: uid -> { user, ts }
const userCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    const uid = payload.uid;

    // If JWT has full user data embedded, use it directly — zero Firestore reads
    if (payload.name && payload.role && payload.isActive !== undefined) {
      req.user = { uid, name: payload.name, email: payload.email, role: payload.role, ownerId: payload.ownerId || null, isActive: payload.isActive, phone: payload.phone || '' };
      return next();
    }

    // Check in-memory cache
    const cached = userCache.get(uid);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }

    // Last resort: Firestore read
    const db = getDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists || !snap.data().isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    const user = { uid, ...snap.data() };
    userCache.set(uid, { user, ts: Date.now() });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function clearUserCache(uid) {
  userCache.delete(uid);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, clearUserCache };
