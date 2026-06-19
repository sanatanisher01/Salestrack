const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: orderId || `receipt_${Date.now()}`,
      notes: {
        customerId: req.user.uid,
        orderId: orderId || '',
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify payment after completion
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Payment verified — update order status
    const db = getDb();
    if (orderId) {
      const orderDoc = await db.collection('customerOrders').doc(orderId).get();
      if (orderDoc.exists) {
        await orderDoc.ref.update({
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          paidAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Also record in payments collection
    const { v4: uuidv4 } = require('uuid');
    const customerDoc = await db.collection('customers').doc(req.user.uid).get();
    if (customerDoc.exists) {
      const customer = customerDoc.data();
      const paymentId = uuidv4();
      await db.collection('payments').doc(paymentId).set({
        customerId: req.user.uid,
        customerName: customer.shopName || '',
        ownerId: customer.linkedOwnerId || '',
        amount: Number(req.body.amount) || 0,
        method: 'razorpay',
        note: `Online payment - ${razorpay_payment_id}`,
        razorpayPaymentId: razorpay_payment_id,
        createdAt: new Date(),
      });
    }

    res.json({ message: 'Payment verified successfully', paymentId: razorpay_payment_id });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;
