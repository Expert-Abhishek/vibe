const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/trips
 * Fetch all trips (for Admin Dashboard / Driver view)
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM trips ORDER BY created_at DESC'
    );

    const trips = result.rows.map(t => ({
      id: t.id,
      tripType: t.trip_type,
      title: t.title,
      customerId: t.customer_id,
      customerName: t.customer_name,
      driverOrGuideName: t.driver_or_guide_name || '',
      planId: t.plan_id,
      destinationIds: t.destination_ids || [],
      amount: parseFloat(t.amount || 0),
      paymentMode: t.payment_mode || 'UPI',
      status: t.status || 'Completed',
      durationHours: parseFloat(t.duration_hours || 8),
      extraHours: parseFloat(t.extra_hours || 0),
      addonCharge: parseFloat(t.addon_charge || 0),
      rating: t.rating || 5,
      createdAt: t.created_at,
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trips', error: error.message });
  }
});

/**
 * GET /api/trips/customer/:customerId
 * Fetch trip history for a specific customer
 */
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(
      'SELECT * FROM trips WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );

    const trips = result.rows.map(t => ({
      id: t.id,
      tripType: t.trip_type,
      title: t.title,
      customerId: t.customer_id,
      customerName: t.customer_name,
      driverOrGuideName: t.driver_or_guide_name || '',
      planId: t.plan_id,
      destinationIds: t.destination_ids || [],
      amount: parseFloat(t.amount || 0),
      paymentMode: t.payment_mode || 'UPI',
      status: t.status || 'Completed',
      durationHours: parseFloat(t.duration_hours || 8),
      extraHours: parseFloat(t.extra_hours || 0),
      addonCharge: parseFloat(t.addon_charge || 0),
      rating: t.rating || 5,
      createdAt: t.created_at,
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching customer trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer trips', error: error.message });
  }
});

/**
 * POST /api/trips
 * Create a new trip / booking
 */
router.post('/', async (req, res) => {
  try {
    const {
      tripType = 'custom_trip',
      title,
      customerId,
      customerName = 'Tourist Customer',
      driverOrGuideName = 'Assigned Driver',
      planId = null,
      destinationIds = [],
      amount = 0,
      paymentMode = 'UPI',
      status = 'Completed',
      durationHours = 8,
      extraHours = 0,
      addonCharge = 0,
      rating = 5,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Trip title is required' });
    }

    const result = await db.query(
      `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, driver_or_guide_name,
        plan_id, destination_ids, amount, payment_mode, status,
        duration_hours, extra_hours, addon_charge, rating
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tripType,
        title.trim(),
        customerId || null,
        customerName.trim(),
        driverOrGuideName,
        planId || null,
        Array.isArray(destinationIds) ? destinationIds : [],
        parseFloat(amount),
        paymentMode,
        status,
        parseFloat(durationHours),
        parseFloat(extraHours),
        parseFloat(addonCharge),
        parseInt(rating, 10),
      ]
    );

    const t = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: {
        id: t.id,
        tripType: t.trip_type,
        title: t.title,
        customerId: t.customer_id,
        customerName: t.customer_name,
        driverOrGuideName: t.driver_or_guide_name,
        planId: t.plan_id,
        destinationIds: t.destination_ids,
        amount: parseFloat(t.amount),
        paymentMode: t.payment_mode,
        status: t.status,
        durationHours: parseFloat(t.duration_hours),
        extraHours: parseFloat(t.extra_hours),
        addonCharge: parseFloat(t.addon_charge),
        rating: t.rating,
        createdAt: t.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
});

/**
 * PATCH /api/trips/:id/status
 * Update trip status (e.g., Completed, Cancelled, Active)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const result = await db.query(
      'UPDATE trips SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    res.json({
      success: true,
      message: `Trip status updated to ${status}`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating trip status:', error);
    res.status(500).json({ success: false, message: 'Failed to update trip status', error: error.message });
  }
});

module.exports = router;
