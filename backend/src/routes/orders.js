const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/webpush');
const { isNonEmptyString, sanitizeString, escapeCsvValue } = require('../utils/validate');

const router = express.Router();
router.use(authenticate);

router.post('/', requireRole('salesman'), async (req, res) => {
  try {
    const { customerName, customerPhone, items, note } = req.body;
    if (!isNonEmptyString(customerName)) return res.status(400).json({ error: 'Customer name is required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

    // Validate items structure
    for (const item of items) {
      if (!isNonEmptyString(item.productName)) return res.status(400).json({ error: 'Each item must have a product name' });
      if (typeof item.quantity !== 'number' || item.quantity <= 0) return res.status(400).json({ error: 'Each item must have a positive quantity' });
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) return res.status(400).json({ error: 'Each item must have a valid unit price' });
    }

    const sanitizedItems = items.map((i) => ({
      productName: sanitizeString(i.productName),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }));

    const totalValue = sanitizedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const db = getDb();
    const id = uuidv4();
    const now = new Date();
    await db.collection('orders').doc(id).set({
      salesmanId: req.user.uid,
      salesmanName: req.user.name,
      ownerId: req.user.ownerId,
      customerName: sanitizeString(customerName),
      customerPhone: sanitizeString(customerPhone || ''),
      items: sanitizedItems,
      note: sanitizeString(note || ''),
      totalValue, status: 'pending',
      createdAt: now, updatedAt: now,
    });

    // Notify owner
    const notifId = uuidv4();
    await db.collection('notifications').doc(notifId).set({
      recipientId: req.user.ownerId,
      recipientRole: 'owner',
      ownerId: req.user.ownerId,
      salesmanId: req.user.uid,
      type: 'new_order',
      title: 'New Order',
      body: `${req.user.name} submitted a new order for ${sanitizeString(customerName)}`,
      read: false,
      orderId: id,
      createdAt: now,
    });

    // Push to owner
    const subSnap = await db.collection('pushSubscriptions').doc(req.user.ownerId).get();
    if (subSnap.exists) {
      const sub = subSnap.data().subscription;
      sendPushNotification(sub, { title: 'New Order', body: `${req.user.name} submitted a new order` }).catch(() => {});
    }

    res.status(201).json({ message: 'Order created', id });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { salesmanId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    let query = db.collection('orders').where('ownerId', '==', ownerId);
    if (salesmanId) query = query.where('salesmanId', '==', salesmanId);
    if (status) query = query.where('status', '==', status);

    const snap = await query.get();

    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Client-side filtering and sorting (avoids needing composite indexes)
    if (startDate) orders = orders.filter((o) => o.createdAt?.toDate?.() >= new Date(startDate));
    if (endDate) orders = orders.filter((o) => o.createdAt?.toDate?.() <= new Date(endDate));
    orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    orders = orders.slice(Number(offset) || 0, (Number(offset) || 0) + Math.min(Number(limit) || 50, 200));

    res.json({ orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export/csv', requireRole('owner'), async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('orders').where('ownerId', '==', req.user.uid).get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const rows = [
      ['ID', 'Salesman', 'Customer', 'Phone', 'Total', 'Status', 'Date'],
      ...orders.map((o) => [
        escapeCsvValue(o.id),
        escapeCsvValue(o.salesmanName),
        escapeCsvValue(o.customerName),
        escapeCsvValue(o.customerPhone),
        escapeCsvValue(o.totalValue),
        escapeCsvValue(o.status),
        escapeCsvValue(o.createdAt?.toDate?.()?.toISOString() || ''),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = { id: doc.id, ...doc.data() };
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    if (order.ownerId !== ownerId && order.salesmanId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', requireRole('owner'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const db = getDb();
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid) return res.status(404).json({ error: 'Not found' });

    const now = new Date();
    await doc.ref.update({ status, updatedAt: now });

    // Notify salesman
    const order = doc.data();
    const notifId = uuidv4();
    await db.collection('notifications').doc(notifId).set({
      recipientId: order.salesmanId,
      recipientRole: 'salesman',
      ownerId: req.user.uid,
      salesmanId: order.salesmanId,
      type: 'order_status',
      title: 'Order Updated',
      body: `Your order for ${order.customerName} is now ${status}`,
      read: false,
      orderId: req.params.id,
      status,
      createdAt: now,
    });

    // Push to salesman
    const subSnap = await db.collection('pushSubscriptions').doc(order.salesmanId).get();
    if (subSnap.exists) {
      const sub = subSnap.data().subscription;
      sendPushNotification(sub, { title: 'Order Updated', body: `Your order for ${order.customerName} is now ${status}` }).catch(() => {});
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
