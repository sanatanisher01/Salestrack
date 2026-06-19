const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { isNonEmptyString, sanitizeString } = require('../utils/validate');

const router = express.Router();
router.use(authenticate);

// Get all products for the owner
router.get('/', requireRole('owner', 'accountant', 'salesman'), async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;
    const snap = await db.collection('products').where('ownerId', '==', ownerId).get();
    let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a product
router.post('/', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { name, price, unit, stock } = req.body;
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'Product name is required' });
    if (typeof price !== 'number' || price < 0) return res.status(400).json({ error: 'Valid price is required' });

    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;

    // Check if product with same name already exists
    const existing = await db.collection('products')
      .where('ownerId', '==', ownerId)
      .where('nameLower', '==', sanitizeString(name).toLowerCase())
      .get();
    if (!existing.empty) return res.status(409).json({ error: 'Product with this name already exists' });

    const id = uuidv4();
    const now = new Date();
    await db.collection('products').doc(id).set({
      name: sanitizeString(name),
      nameLower: sanitizeString(name).toLowerCase(),
      ownerId,
      price: Number(price),
      unit: sanitizeString(unit || 'piece'),
      stock: typeof stock === 'number' ? stock : null,
      images: Array.isArray(req.body.images) ? req.body.images.slice(0, 5) : [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ message: 'Product created', id });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a product
router.patch('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const { name, price, unit, stock, isActive } = req.body;
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;

    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== ownerId) return res.status(404).json({ error: 'Not found' });

    const update = { updatedAt: new Date() };
    if (isNonEmptyString(name)) {
      update.name = sanitizeString(name);
      update.nameLower = sanitizeString(name).toLowerCase();
    }
    if (typeof price === 'number' && price >= 0) update.price = price;
    if (isNonEmptyString(unit)) update.unit = sanitizeString(unit);
    if (typeof stock === 'number') update.stock = stock;
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (Array.isArray(req.body.images)) update.images = req.body.images.slice(0, 5);

    await doc.ref.update(update);
    res.json({ message: 'Product updated' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a product
router.delete('/:id', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.role === 'owner' ? req.user.uid : req.user.ownerId;

    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== ownerId) return res.status(404).json({ error: 'Not found' });

    await doc.ref.delete();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
