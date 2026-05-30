const { verifyToken } = require('../utils/jwt');
const { getDb } = require('../config/firebase');

// In-memory cache: uid -> { user, ts }
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (reduced from 10)

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = verifyToken(auth.slice(7));
    const uid = payload.uid;

    // Always verify user status from cache or DB — never trust JWT payload alone
    const cached = userCache.get(uid);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }

    // Firestore read to verify current user state
    const db = getDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists || !snap.data().isActive) {
      // Check if it's a customer
      const customerSnap = await db.collection('customers').doc(uid).get();
      if (customerSnap.exists && !customerSnap.data().isBlocked) {
        const data = customerSnap.data();
        const user = { uid, name: data.shopName || data.ownerName, email: data.email, role: 'customer', ownerId: data.linkedOwnerId || null, isActive: true };
        userCache.set(uid, { user, ts: Date.now() });
        req.user = user;
        return next();
      }
      userCache.delete(uid);
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    const data = snap.data();
    const user = { uid, name: data.name, email: data.email, role: data.role, ownerId: data.ownerId || null, isActive: data.isActive, phone: data.phone || '' };
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
