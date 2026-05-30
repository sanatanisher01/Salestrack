const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { isNonEmptyString, sanitizeString } = require('../utils/validate');

const router = express.Router();
router.use(authenticate);

// Owner: record a payment from customer
router.post('/', requireRole('owner'), async (req, res) => {
  try {
    const { customerId, amount, method, note } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID required' });
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const db = getDb();
    // Verify customer belongs to this owner
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists || customerDoc.data().linkedOwnerId !== req.user.uid) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const id = uuidv4();
    const now = new Date();
    await db.collection('payments').doc(id).set({
      customerId,
      customerName: customerDoc.data().shopName,
      ownerId: req.user.uid,
      amount: Number(amount),
      method: sanitizeString(method || 'cash'),
      note: sanitizeString(note || ''),
      createdAt: now,
    });

    res.status(201).json({ message: 'Payment recorded', id });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Owner: get payment history for a customer
router.get('/customer/:customerId', requireRole('owner'), async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('payments')
      .where('customerId', '==', req.params.customerId)
      .where('ownerId', '==', req.user.uid)
      .get();
    let payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    payments.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    res.json({ payments });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Owner: get ledger summary for all customers (total orders, total paid, balance)
router.get('/ledger', requireRole('owner'), async (req, res) => {
  try {
    const db = getDb();

    // Get all customer orders for this owner
    const ordersSnap = await db.collection('customerOrders').where('ownerId', '==', req.user.uid).get();
    const orders = ordersSnap.docs.map((d) => d.data());

    // Get all payments for this owner
    const paymentsSnap = await db.collection('payments').where('ownerId', '==', req.user.uid).get();
    const payments = paymentsSnap.docs.map((d) => d.data());

    // Get customers
    const customersSnap = await db.collection('customers').where('linkedOwnerId', '==', req.user.uid).get();
    const customers = customersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

    // Build ledger per customer
    const ledger = customers.map((c) => {
      const customerOrders = orders.filter((o) => o.customerId === c.uid && o.status !== 'cancelled');
      const customerPayments = payments.filter((p) => p.customerId === c.uid);
      const totalOrdered = customerOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      return {
        uid: c.uid,
        shopName: c.shopName,
        ownerName: c.ownerName,
        mobile: c.mobile,
        totalOrdered,
        totalPaid,
        balance: totalOrdered - totalPaid,
        orderCount: customerOrders.length,
      };
    });

    // Sort by balance (highest first)
    ledger.sort((a, b) => b.balance - a.balance);
    res.json({ ledger });
  } catch (err) {
    console.error('Get ledger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer: view their own payment history and balance
router.get('/me', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Forbidden' });

    const db = getDb();
    const customerDoc = await db.collection('customers').doc(req.user.uid).get();
    if (!customerDoc.exists) return res.status(404).json({ error: 'Not registered' });
    const customer = customerDoc.data();

    // Get orders
    const ordersSnap = await db.collection('customerOrders')
      .where('customerId', '==', req.user.uid)
      .get();
    const orders = ordersSnap.docs.map((d) => d.data()).filter((o) => o.status !== 'cancelled');
    const totalOrdered = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

    // Get payments
    const paymentsSnap = await db.collection('payments')
      .where('customerId', '==', req.user.uid)
      .get();
    let payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    payments.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      totalOrdered,
      totalPaid,
      balance: totalOrdered - totalPaid,
      payments,
    });
  } catch (err) {
    console.error('Get my payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
