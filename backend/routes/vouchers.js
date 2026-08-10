const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/vouchers
 * List all vouchers (Admin / System)
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM vouchers ORDER BY created_at DESC`
    );

    const vouchers = result.rows.map(v => ({
      id: v.id,
      code: v.code,
      description: v.description || '',
      discountType: v.discount_type, // 'percentage' or 'fixed'
      discountValue: parseFloat(v.discount_value),
      minTripAmount: parseFloat(v.min_trip_amount || 0),
      maxDiscountAmount: v.max_discount_amount ? parseFloat(v.max_discount_amount) : null,
      isActive: v.is_active,
      expiryDate: v.expiry_date,
      usageLimit: v.usage_limit ? parseInt(v.usage_limit, 10) : null,
      usedCount: parseInt(v.used_count || 0, 10),
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));

    res.json({ success: true, data: vouchers });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vouchers', error: error.message });
  }
});

/**
 * POST /api/vouchers
 * Create a new voucher (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const {
      code,
      description = '',
      discountType,
      discountValue,
      minTripAmount = 0,
      maxDiscountAmount = null,
      isActive = true,
      expiryDate = null,
      usageLimit = null
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ success: false, message: 'Invalid discount type. Must be percentage or fixed.' });
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Discount value must be a positive number' });
    }

    if (discountType === 'percentage' && val > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' });
    }

    // Check duplicate code
    const checkRes = await db.query('SELECT id FROM vouchers WHERE UPPER(code) = $1', [cleanCode]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: `Voucher code '${cleanCode}' already exists` });
    }

    const result = await db.query(
      `INSERT INTO vouchers (code, description, discount_type, discount_value, min_trip_amount, max_discount_amount, is_active, expiry_date, usage_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        cleanCode,
        description.trim(),
        discountType,
        val,
        parseFloat(minTripAmount || 0),
        maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        isActive,
        expiryDate || null,
        usageLimit ? parseInt(usageLimit, 10) : null
      ]
    );

    const v = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: {
        id: v.id,
        code: v.code,
        description: v.description,
        discountType: v.discount_type,
        discountValue: parseFloat(v.discount_value),
        minTripAmount: parseFloat(v.min_trip_amount || 0),
        maxDiscountAmount: v.max_discount_amount ? parseFloat(v.max_discount_amount) : null,
        isActive: v.is_active,
        expiryDate: v.expiry_date,
        usageLimit: v.usage_limit,
        usedCount: v.used_count,
        createdAt: v.created_at,
        updatedAt: v.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({ success: false, message: 'Failed to create voucher', error: error.message });
  }
});

/**
 * PUT /api/vouchers/:id
 * Update an existing voucher (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      minTripAmount,
      maxDiscountAmount,
      isActive,
      expiryDate,
      usageLimit
    } = req.body;

    const checkRes = await db.query('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    const currentV = checkRes.rows[0];
    const newCode = code ? code.trim().toUpperCase() : currentV.code;
    const newDesc = description !== undefined ? description.trim() : currentV.description;
    const newType = discountType || currentV.discount_type;
    const newVal = discountValue !== undefined ? parseFloat(discountValue) : parseFloat(currentV.discount_value);
    const newMin = minTripAmount !== undefined ? parseFloat(minTripAmount) : parseFloat(currentV.min_trip_amount || 0);
    const newMax = maxDiscountAmount !== undefined ? (maxDiscountAmount ? parseFloat(maxDiscountAmount) : null) : currentV.max_discount_amount;
    const newActive = isActive !== undefined ? Boolean(isActive) : currentV.is_active;
    const newExpiry = expiryDate !== undefined ? expiryDate : currentV.expiry_date;
    const newLimit = usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit, 10) : null) : currentV.usage_limit;

    // Check code uniqueness if code changed
    if (newCode !== currentV.code) {
      const dupCheck = await db.query('SELECT id FROM vouchers WHERE UPPER(code) = $1 AND id != $2', [newCode, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Voucher code '${newCode}' is already in use` });
      }
    }

    const result = await db.query(
      `UPDATE vouchers
       SET code = $1, description = $2, discount_type = $3, discount_value = $4,
           min_trip_amount = $5, max_discount_amount = $6, is_active = $7,
           expiry_date = $8, usage_limit = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [newCode, newDesc, newType, newVal, newMin, newMax, newActive, newExpiry, newLimit, id]
    );

    const v = result.rows[0];
    res.json({
      success: true,
      message: 'Voucher updated successfully',
      data: {
        id: v.id,
        code: v.code,
        description: v.description,
        discountType: v.discount_type,
        discountValue: parseFloat(v.discount_value),
        minTripAmount: parseFloat(v.min_trip_amount || 0),
        maxDiscountAmount: v.max_discount_amount ? parseFloat(v.max_discount_amount) : null,
        isActive: v.is_active,
        expiryDate: v.expiry_date,
        usageLimit: v.usage_limit,
        usedCount: v.used_count,
        createdAt: v.created_at,
        updatedAt: v.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating voucher:', error);
    res.status(500).json({ success: false, message: 'Failed to update voucher', error: error.message });
  }
});

/**
 * DELETE /api/vouchers/:id
 * Delete voucher (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM vouchers WHERE id = $1 RETURNING id, code', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    res.json({ success: true, message: `Voucher ${result.rows[0].code} deleted successfully` });
  } catch (error) {
    console.error('Error deleting voucher:', error);
    res.status(500).json({ success: false, message: 'Failed to delete voucher', error: error.message });
  }
});

/**
 * POST /api/vouchers/validate
 * Validate voucher code & calculate discount
 * Body: { code: string, tripType: 'plan_package' | 'custom_trip', amount: number }
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, tripType, amount } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Enforce trip type restriction: ONLY Plan & Custom Trip
    const validTripTypes = ['plan_package', 'custom_trip'];
    if (!tripType || !validTripTypes.includes(tripType)) {
      return res.status(400).json({
        success: false,
        message: 'Vouchers can only be applied to Plan Packages and Custom Trips.'
      });
    }

    const tripAmount = parseFloat(amount);
    if (isNaN(tripAmount) || tripAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid trip amount' });
    }

    // Search voucher
    const result = await db.query(
      'SELECT * FROM vouchers WHERE UPPER(code) = $1',
      [cleanCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Invalid voucher code '${cleanCode}'` });
    }

    const v = result.rows[0];

    // Check active
    if (!v.is_active) {
      return res.status(400).json({ success: false, message: `Voucher '${cleanCode}' is currently inactive` });
    }

    // Check expiration
    if (v.expiry_date && new Date(v.expiry_date) < new Date()) {
      return res.status(400).json({ success: false, message: `Voucher '${cleanCode}' has expired` });
    }

    // Check usage limit
    if (v.usage_limit && v.used_count >= v.usage_limit) {
      return res.status(400).json({ success: false, message: `Voucher '${cleanCode}' usage limit reached` });
    }

    // Check minimum trip amount
    const minAmount = parseFloat(v.min_trip_amount || 0);
    if (tripAmount < minAmount) {
      return res.status(400).json({
        success: false,
        message: `Voucher '${cleanCode}' requires a minimum booking amount of ₹${minAmount}`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    const discountValue = parseFloat(v.discount_value);

    if (v.discount_type === 'percentage') {
      discountAmount = (tripAmount * discountValue) / 100;
      if (v.max_discount_amount) {
        const maxCap = parseFloat(v.max_discount_amount);
        if (discountAmount > maxCap) {
          discountAmount = maxCap;
        }
      }
    } else if (v.discount_type === 'fixed') {
      discountAmount = discountValue;
    }

    // Cap discount at trip amount
    if (discountAmount > tripAmount) {
      discountAmount = tripAmount;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((tripAmount - discountAmount) * 100) / 100);

    res.json({
      success: true,
      message: `Voucher '${cleanCode}' applied successfully!`,
      data: {
        id: v.id,
        code: v.code,
        description: v.description,
        discountType: v.discount_type,
        discountValue,
        discountAmount,
        originalAmount: tripAmount,
        finalAmount
      }
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    res.status(500).json({ success: false, message: 'Failed to validate voucher', error: error.message });
  }
});

module.exports = router;
