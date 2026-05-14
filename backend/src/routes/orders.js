const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/webpush');

const router = express.Router();
router.use(authenticate);

router.post('/', requireRole('salesman'), async (req, res) => {
  const { customerName, customerPhone, items, note } = req.body;
  if (!customerName || !items?.length) return res.status(400).json({ error: 'Customer name and items required' });

  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const db = getDb();
  const id = uuidv4();
  const now = new Date();
  await db.collection('orders').doc(id).set({
    salesmanId: req.user.uid,
    salesmanName: req.user.name,
    ownerId: req.user.ownerId,
    customerName, customerPhone: customerPhone || '',
    items, note: note || '',
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
    body: `${req.user.name} submitted a new order for ${customerName}`,
    read: false,
    orderId: id,
    createdAt: now,
  });

  // Push to owner
  const subSnap = await db.collection('pushSubscriptions').where('uid', '==', req.user.ownerId).get();
  if (!subSnap.empty) {
    const sub = subSnap.docs[0].data().subscription;
    sendPushNotification(sub, { title: 'New Order', body: `${req.user.name} submitted a new order` }).catch(() => {});
  }

  res.status(201).json({ message: 'Order created', id });
});

router.get('/', requireRole('owner', 'accountant'), async (req, res) => {
  const { salesmanId, status, startDate, endDate } = req.query;
  const db = getDb();
  const snap = await db.collection('orders').where('ownerId', '==', req.user.ownerId || req.user.uid).get();
  let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (salesmanId) orders = orders.filter((o) => o.salesmanId === salesmanId);
  if (status) orders = orders.filter((o) => o.status === status);
  if (startDate) orders = orders.filter((o) => o.createdAt?.toDate?.() >= new Date(startDate));
  if (endDate) orders = orders.filter((o) => o.createdAt?.toDate?.() <= new Date(endDate));
  orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  res.json({ orders });
});

router.get('/export/csv', requireRole('owner'), async (req, res) => {
  const db = getDb();
  const snap = await db.collection('orders').where('ownerId', '==', req.user.uid).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rows = [
    ['ID', 'Salesman', 'Customer', 'Phone', 'Total', 'Status', 'Date'],
    ...orders.map((o) => [
      o.id, o.salesmanName, o.customerName, o.customerPhone,
      o.totalValue, o.status,
      o.createdAt?.toDate?.()?.toISOString() || '',
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
  res.send(csv);
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('orders').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
  const order = { id: doc.id, ...doc.data() };
  const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
  if (order.ownerId !== ownerId && order.salesmanId !== req.user.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(order);
});

router.patch('/:id/status', requireRole('owner'), async (req, res) => {
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

  res.json({ message: 'Status updated' });
});

module.exports = router;
