const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, getAdmin } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { isNonEmptyString, sanitizeString, isValidLat, isValidLng } = require('../utils/validate');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// --- Customer Google Login ---
// Frontend sends Firebase ID token after Google sign-in
router.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token required' });

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    const db = getDb();
    const userDoc = await db.collection('customers').doc(uid).get();

    if (userDoc.exists) {
      const customer = userDoc.data();
      if (customer.isBlocked) return res.status(403).json({ error: 'Account blocked. Contact support.' });

      const token = generateToken({ uid, role: 'customer' });
      return res.json({ token, customer: { uid, ...customer }, isNew: false });
    }

    // New customer — return token but mark as new (needs registration)
    const token = generateToken({ uid, role: 'customer', email, name });
    res.json({ token, customer: { uid, email, name, picture }, isNew: true });
  } catch (err) {
    console.error('Customer Google auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// --- Customer Registration (after Google login) ---
router.post('/register', authenticate, async (req, res) => {
  try {
    const { shopName, ownerName, mobile, gstin, category, shopLocation, ownerCode } = req.body;
    if (!isNonEmptyString(shopName)) return res.status(400).json({ error: 'Shop name is required' });
    if (!isNonEmptyString(ownerName)) return res.status(400).json({ error: 'Owner name is required' });
    if (!isNonEmptyString(mobile)) return res.status(400).json({ error: 'Mobile number is required' });

    const db = getDb();

    // Resolve linked owner
    let linkedOwnerId = null;
    if (ownerCode) {
      // Owner code is the owner's UID (or a short code they share)
      const ownerDoc = await db.collection('users').doc(ownerCode).get();
      if (ownerDoc.exists && ownerDoc.data().role === 'owner' && ownerDoc.data().isActive) {
        linkedOwnerId = ownerCode;
      } else {
        // Try finding by a custom code field
        const byCode = await db.collection('users')
          .where('customerCode', '==', ownerCode.toUpperCase())
          .where('role', '==', 'owner')
          .get();
        if (!byCode.empty) linkedOwnerId = byCode.docs[0].id;
      }
      if (!linkedOwnerId) return res.status(400).json({ error: 'Invalid owner code' });
    }

    // Validate shop location if provided
    let location = null;
    if (shopLocation && isValidLat(Number(shopLocation.lat)) && isValidLng(Number(shopLocation.lng))) {
      location = { lat: Number(shopLocation.lat), lng: Number(shopLocation.lng), address: sanitizeString(shopLocation.address || '') };
    }

    const now = new Date();
    await db.collection('customers').doc(req.user.uid).set({
      shopName: sanitizeString(shopName),
      ownerName: sanitizeString(ownerName),
      mobile: sanitizeString(mobile),
      gstin: sanitizeString(gstin || ''),
      category: sanitizeString(category || ''),
      email: req.user.email || '',
      shopLocation: location,
      linkedOwnerId,
      isActive: true,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
    });

    const customer = (await db.collection('customers').doc(req.user.uid).get()).data();
    res.status(201).json({ message: 'Registration complete', customer: { uid: req.user.uid, ...customer } });
  } catch (err) {
    console.error('Customer register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Link to owner (if not done during registration) ---
router.post('/link-owner', authenticate, async (req, res) => {
  try {
    const { ownerCode } = req.body;
    if (!isNonEmptyString(ownerCode)) return res.status(400).json({ error: 'Owner code is required' });

    const db = getDb();
    let linkedOwnerId = null;

    const ownerDoc = await db.collection('users').doc(ownerCode).get();
    if (ownerDoc.exists && ownerDoc.data().role === 'owner' && ownerDoc.data().isActive) {
      linkedOwnerId = ownerCode;
    } else {
      const byCode = await db.collection('users')
        .where('customerCode', '==', ownerCode.toUpperCase())
        .where('role', '==', 'owner')
        .get();
      if (!byCode.empty) linkedOwnerId = byCode.docs[0].id;
    }
    if (!linkedOwnerId) return res.status(400).json({ error: 'Invalid owner code' });

    await db.collection('customers').doc(req.user.uid).update({ linkedOwnerId, updatedAt: new Date() });
    res.json({ message: 'Linked to owner', linkedOwnerId });
  } catch (err) {
    console.error('Link owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Get customer profile ---
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('customers').doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not registered' });
    res.json({ uid: req.user.uid, ...doc.data() });
  } catch (err) {
    console.error('Get customer profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Update shop location ---
router.patch('/location', authenticate, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    if (!isValidLat(Number(lat)) || !isValidLng(Number(lng))) {
      return res.status(400).json({ error: 'Valid location required' });
    }
    const db = getDb();
    await db.collection('customers').doc(req.user.uid).update({
      shopLocation: { lat: Number(lat), lng: Number(lng), address: sanitizeString(address || '') },
      updatedAt: new Date(),
    });
    res.json({ message: 'Location updated' });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Get products (from linked owner's inventory) ---
router.get('/products', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const customerDoc = await db.collection('customers').doc(req.user.uid).get();
    if (!customerDoc.exists) return res.status(404).json({ error: 'Not registered' });
    const { linkedOwnerId } = customerDoc.data();
    if (!linkedOwnerId) return res.json({ products: [] });

    const snap = await db.collection('products').where('ownerId', '==', linkedOwnerId).where('isActive', '==', true).get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Place order ---
router.post('/orders', authenticate, async (req, res) => {
  try {
    const { items, deliveryAddress, note, paymentMethod } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item required' });

    const db = getDb();
    const customerDoc = await db.collection('customers').doc(req.user.uid).get();
    if (!customerDoc.exists) return res.status(404).json({ error: 'Not registered' });
    const customer = customerDoc.data();
    if (!customer.linkedOwnerId) return res.status(400).json({ error: 'Not linked to any owner. Enter owner code first.' });

    // Validate items
    for (const item of items) {
      if (!isNonEmptyString(item.productName)) return res.status(400).json({ error: 'Each item must have a product name' });
      if (typeof item.quantity !== 'number' || item.quantity <= 0) return res.status(400).json({ error: 'Each item must have a positive quantity' });
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) return res.status(400).json({ error: 'Each item must have a valid price' });
    }

    const sanitizedItems = items.map((i) => ({
      productName: sanitizeString(i.productName),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }));
    const totalValue = sanitizedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    // Use shop location or provided delivery address
    let address = customer.shopLocation || null;
    if (deliveryAddress && isValidLat(Number(deliveryAddress.lat)) && isValidLng(Number(deliveryAddress.lng))) {
      address = { lat: Number(deliveryAddress.lat), lng: Number(deliveryAddress.lng), address: sanitizeString(deliveryAddress.address || '') };
    }

    const id = uuidv4();
    const now = new Date();
    await db.collection('customerOrders').doc(id).set({
      customerId: req.user.uid,
      customerName: customer.shopName,
      customerPhone: customer.mobile,
      ownerId: customer.linkedOwnerId,
      items: sanitizedItems,
      deliveryAddress: address,
      note: sanitizeString(note || ''),
      totalValue,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Notify owner
    const notifId = uuidv4();
    await db.collection('notifications').doc(notifId).set({
      recipientId: customer.linkedOwnerId,
      recipientRole: 'owner',
      ownerId: customer.linkedOwnerId,
      type: 'customer_order',
      title: 'New Customer Order',
      body: `${customer.shopName} placed an order worth ₹${totalValue.toFixed(0)}`,
      read: false,
      orderId: id,
      createdAt: now,
    });

    res.status(201).json({ message: 'Order placed', id });
  } catch (err) {
    console.error('Customer place order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Get my orders ---
router.get('/orders', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('customerOrders').where('customerId', '==', req.user.uid).get();
    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json({ orders });
  } catch (err) {
    console.error('Get customer orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Submit report ---
router.post('/reports', authenticate, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!isNonEmptyString(subject)) return res.status(400).json({ error: 'Subject is required' });
    if (!isNonEmptyString(message)) return res.status(400).json({ error: 'Message is required' });

    const db = getDb();
    const customerDoc = await db.collection('customers').doc(req.user.uid).get();
    if (!customerDoc.exists) return res.status(404).json({ error: 'Not registered' });
    const customer = customerDoc.data();

    const id = uuidv4();
    await db.collection('reports').doc(id).set({
      fromId: req.user.uid,
      fromName: customer.shopName,
      fromRole: 'customer',
      toId: customer.linkedOwnerId || 'admin',
      subject: sanitizeString(subject),
      message: sanitizeString(message),
      status: 'open',
      createdAt: new Date(),
    });
    res.status(201).json({ message: 'Report submitted', id });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Get my reports ---
router.get('/reports', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('reports').where('fromId', '==', req.user.uid).get();
    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    reports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json({ reports });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Owner/Accountant: get customer orders ---
router.get('/owner/orders', authenticate, requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    const snap = await db.collection('customerOrders').where('ownerId', '==', ownerId).get();
    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json({ orders });
  } catch (err) {
    console.error('Owner get customer orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Owner/Accountant: update customer order status ---
router.patch('/owner/orders/:id/status', authenticate, requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    const doc = await db.collection('customerOrders').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== ownerId) return res.status(404).json({ error: 'Not found' });

    await doc.ref.update({ status, updatedAt: new Date() });
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Update customer order status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Owner/Accountant: get their customers ---
router.get('/owner/customers', authenticate, requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    const snap = await db.collection('customers').where('linkedOwnerId', '==', ownerId).get();
    const customers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.json({ customers });
  } catch (err) {
    console.error('Owner get customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Owner: report about customer ---
router.post('/owner/reports', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const { customerId, subject, message } = req.body;
    if (!isNonEmptyString(subject)) return res.status(400).json({ error: 'Subject is required' });
    if (!isNonEmptyString(message)) return res.status(400).json({ error: 'Message is required' });

    const db = getDb();
    const id = uuidv4();
    await db.collection('reports').doc(id).set({
      fromId: req.user.uid,
      fromName: req.user.name,
      fromRole: 'owner',
      toId: customerId || 'admin',
      subject: sanitizeString(subject),
      message: sanitizeString(message),
      status: 'open',
      createdAt: new Date(),
    });
    res.status(201).json({ message: 'Report submitted', id });
  } catch (err) {
    console.error('Owner submit report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin: get all customers ---
router.get('/admin/customers', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('customers').get();
    const customers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.json({ customers });
  } catch (err) {
    console.error('Admin get customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin: block/unblock customer ---
router.patch('/admin/customers/:uid/block', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    await db.collection('customers').doc(req.params.uid).update({ isBlocked: true, updatedAt: new Date() });
    res.json({ message: 'Customer blocked' });
  } catch (err) {
    console.error('Admin block customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admin/customers/:uid/unblock', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    await db.collection('customers').doc(req.params.uid).update({ isBlocked: false, updatedAt: new Date() });
    res.json({ message: 'Customer unblocked' });
  } catch (err) {
    console.error('Admin unblock customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin: get all reports ---
router.get('/admin/reports', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('reports').get();
    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    reports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json({ reports });
  } catch (err) {
    console.error('Admin get reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin: resolve report ---
router.patch('/admin/reports/:id/resolve', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    await db.collection('reports').doc(req.params.id).update({ status: 'resolved', updatedAt: new Date() });
    res.json({ message: 'Report resolved' });
  } catch (err) {
    console.error('Admin resolve report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
