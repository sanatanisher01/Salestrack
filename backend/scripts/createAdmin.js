require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { v4: uuidv4 } = require('uuid');
const { initFirebase, getDb } = require('../src/config/firebase');
const { hashPassword } = require('../src/utils/password');

async function createAdmin() {
  initFirebase();
  const db = getDb();

  const email = 'admin@salestrack.com';
  const existing = await db.collection('users').where('email', '==', email).get();
  if (!existing.empty) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const uid = uuidv4();
  const passwordHash = await hashPassword('Admin@123456');
  const now = new Date();
  await db.collection('users').doc(uid).set({
    uid, name: 'Admin', email, passwordHash,
    role: 'admin', ownerId: null, isActive: true,
    failedLoginAttempts: 0, lockedUntil: null,
    createdAt: now, updatedAt: now,
  });
  console.log('Admin created:', email);
  process.exit(0);
}

createAdmin().catch((e) => { console.error(e); process.exit(1); });
