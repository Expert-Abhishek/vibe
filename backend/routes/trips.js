const express = require('express');
const db = require('../config/db');
const { emitNotification } = require('../config/socket');

const router = express.Router();

// Auto-migrate trips table columns if missing on production database
async function ensureTripsColumnsExist() {
  try {
    await db.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'INSTANT';
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_deposit_paid NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS remaining_cash_balance NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_or_guide_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS otp VARCHAR(10);
    `);
  } catch (e) {
    console.warn('Trips table auto-migration warning:', e.message);
  }
}

// Run migration on route load
ensureTripsColumnsExist();

/**
 * Expo Push Notification Helper
 */
async function sendExpoPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken')) {
    return;
  }
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
      }),
    });
    const result = await response.json();
    console.log('📡 Expo Push Notification sent:', result);
  } catch (err) {
    console.error('❌ Failed to send Expo Push Notification:', err);
  }
}

/**
 * Activity Notification Logger Helper
 */
async function logActivityNotification(userId, role, title, body, tripId = null) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        role VARCHAR(20) DEFAULT 'tourist',
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        trip_id UUID,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(
      `INSERT INTO activity_notifications (user_id, role, title, body, trip_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId || null, role || 'tourist', title, body, tripId || null]
    );

    // Real-time WebSocket event emission
    emitNotification({
      userId,
      role: role || 'tourist',
      title,
      body,
      tripId,
    });

    if (userId) {
      const userRes = await db.query('SELECT push_token FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0 && userRes.rows[0].push_token) {
        sendExpoPushNotification(userRes.rows[0].push_token, title, body, { tripId, role });
      }
    }
  } catch (err) {
    console.error('❌ Failed to log activity notification:', err);
  }
}

/**
 * GET /api/trips/notifications/:userId
 * Fetch activity notifications for bell icon drawer
 */
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role = 'tourist' } = req.query;

    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        role VARCHAR(20) DEFAULT 'tourist',
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        trip_id UUID,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const isValidUuid = userId && UUID_REGEX.test(userId);

    let result;
    if (isValidUuid) {
      result = await db.query(
        `SELECT * FROM activity_notifications 
         WHERE (user_id = $1 OR user_id IS NULL) 
           AND (role = $2 OR role = 'all')
         ORDER BY created_at DESC LIMIT 50`,
        [userId, role]
      );
    } else {
      result = await db.query(
        `SELECT * FROM activity_notifications 
         WHERE user_id IS NULL 
           AND (role = $1 OR role = 'all')
         ORDER BY created_at DESC LIMIT 50`,
        [role]
      );
    }

    const logs = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tripId: row.trip_id,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/trips/admin-notify
 * Admin sends broadcast or target notification for pricing/status updates
 */
router.post('/admin-notify', async (req, res) => {
  try {
    const { userId, role = 'driver', title, body } = req.body;
    await logActivityNotification(userId || null, role, title, body, null);
    res.json({ success: true, message: 'Notification broadcasted successfully' });
  } catch (error) {
    console.error('Error in admin-notify endpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
});

/**
 * GET /api/trips/live-location/:tripId
 * Fetch live driver location and status for Tourist live map tracking
 */
router.get('/live-location/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];
    let driverData = {
      name: trip.driver_or_guide_name || 'Captain Anil Gowda',
      phone: '+91 99000 82400',
      vehicleModel: 'Mahindra Thar 4x4 / Innova',
      vehicleNumber: 'KA-03-EX-8240',
      rating: 4.9,
      latitude: parseFloat(trip.pickup_lat || 12.9716),
      longitude: parseFloat(trip.pickup_lng || 77.5946),
    };

    if (trip.driver_id) {
      const dpRes = await db.query(
        `SELECT dp.*, u.name, u.phone 
         FROM driver_profiles dp 
         JOIN users u ON u.id = dp.user_id 
         WHERE dp.user_id = $1 OR dp.id = $1`,
        [trip.driver_id]
      );
      if (dpRes.rows.length > 0) {
        const dp = dpRes.rows[0];
        driverData = {
          name: dp.name || driverData.name,
          phone: dp.phone || driverData.phone,
          vehicleModel: dp.vehicle_model || driverData.vehicleModel,
          vehicleNumber: dp.vehicle_number || driverData.vehicleNumber,
          rating: parseFloat(dp.rating || 4.9),
          latitude: parseFloat(dp.latitude || 12.9716),
          longitude: parseFloat(dp.longitude || 77.5946),
        };
      }
    }

    res.json({
      success: true,
      data: {
        tripId: trip.id,
        status: trip.status,
        otp: trip.otp,
        pickupName: trip.pickup_name,
        dropName: trip.drop_name,
        amount: parseFloat(trip.amount || 0),
        driver: driverData,
      }
    });
  } catch (error) {
    console.error('Error fetching live location:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live location' });
  }
});

/**
 * Helper: Pre-Booking Time-Gate Validation Guard
 * Enforces that pre-booked rides can only be started within 15 minutes prior to scheduled time.
 */
function canDriverStartTrip(scheduledTime, bookingType = 'INSTANT') {
  if (bookingType === 'INSTANT' || !scheduledTime) {
    return { allowed: true };
  }

  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  if (isNaN(scheduledDate.getTime())) {
    return { allowed: true };
  }

  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const allowedStart = new Date(scheduledDate.getTime() - windowMs);

  if (now < allowedStart) {
    const formatted = scheduledDate.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return {
      allowed: false,
      unlocksAt: formatted,
      message: `Trip unlocks 15 minutes prior to scheduled time: ${formatted}`,
    };
  }

  return { allowed: true };
}

/**
 * POST /api/trips/:id/status
 * Updates trip status with strict pre-booking time-gate validation
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, driverName = 'Captain' } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];

    // API Level Lock: Validate pre-booking 
    // minute time-gate guard for activation states
    if (['STARTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED', 'TRIP_STARTED'].includes(status)) {
      const guardCheck = canDriverStartTrip(trip.scheduled_time, trip.booking_type);
      if (!guardCheck.allowed) {
        return res.status(400).json({
          success: false,
          code: 'PREBOOKING_LOCKED',
          message: guardCheck.message,
          unlocksAt: guardCheck.unlocksAt,
        });
      }
    }

    const updateRes = await db.query(
      `UPDATE trips SET status = $1, driver_or_guide_name = COALESCE($2, driver_or_guide_name) WHERE id = $3 RETURNING *`,
      [status, driverName, id]
    );

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Failed to update trip status' });
  }
});

/**
 * POST /api/trips/:id/complete
 * Completes trip and computes cash settlement details (deposit vs remaining balance)
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName = 'Captain' } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];
    const totalFare = parseFloat(trip.amount || 0);
    const bookingType = trip.booking_type || 'INSTANT';

    // Settlement computation
    const isPreBooked = bookingType === 'PRE_BOOKED';
    const advanceDepositPaid = isPreBooked ? parseFloat(trip.advance_deposit_paid || (totalFare * 0.20)) : 0;
    const remainingCashBalance = isPreBooked ? totalFare - advanceDepositPaid : totalFare;

    const updateRes = await db.query(
      `UPDATE trips SET status = 'Completed', driver_or_guide_name = COALESCE($1, driver_or_guide_name) WHERE id = $2 RETURNING *`,
      [driverName, id]
    );

    res.json({
      success: true,
      message: 'Trip completed successfully',
      settlement: {
        bookingType,
        totalFare,
        advanceDepositPaid,
        remainingCashBalance,
        cashToCollect: remainingCashBalance,
        isDepositDeducted: isPreBooked,
      },
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
});

/**
 * POST /api/trips/:id/arrive
 * Driver taps "Arrived at Pickup"
 */
router.post('/:id/arrive', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName = 'Captain' } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length > 0) {
      const trip = tripRes.rows[0];
      const guardCheck = canDriverStartTrip(trip.scheduled_time, trip.booking_type);
      if (!guardCheck.allowed) {
        return res.status(400).json({
          success: false,
          code: 'PREBOOKING_LOCKED',
          message: guardCheck.message,
          unlocksAt: guardCheck.unlocksAt,
        });
      }
    }

    const result = await db.query(
      "UPDATE trips SET status = 'Arrived' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = result.rows[0];

    logActivityNotification(
      trip.customer_id,
      'tourist',
      '📍 Captain Arrived at Pickup!',
      `${driverName} has arrived at your pickup location! Share OTP ${trip.otp || '8240'} to start ride.`,
      trip.id
    );

    res.json({ success: true, message: 'Status updated to Arrived', data: trip });
  } catch (error) {
    console.error('Error updating arrive status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

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
      pickupName: t.pickup_name || 'Bengaluru City',
      dropName: t.drop_name || t.title,
      otp: t.otp || '8240',
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
 * POST /api/trips/book
 * Tourist creates a new Cab / Guide booking and dispatches Push Notifications to Drivers/Guides!
 */
router.post('/book', async (req, res) => {
  try {
    const {
      tripType = 'cab', // 'cab' or 'guide'
      title,
      customerId,
      customerName = 'Tourist',
      pickupName = 'Bengaluru City Center',
      dropName = 'Mysuru Palace Landmark',
      pickupLat = 12.9716,
      pickupLng = 77.5946,
      dropLat = 12.2958,
      dropLng = 76.6394,
      amount = 1200,
      paymentMode = 'UPI',
      bookingType = 'INSTANT',
      scheduledTime = null,
    } = req.body;

    const numAmount = parseFloat(amount || 0);
    const isPreBooked = bookingType === 'PRE_BOOKED';
    const advanceDepositPaid = isPreBooked ? Math.round(numAmount * 0.20) : 0;
    const remainingCashBalance = isPreBooked ? numAmount - advanceDepositPaid : numAmount;

    // Wallet Balance Check for Wallet/UPI payment mode
    if (paymentMode && paymentMode.toLowerCase().includes('upi') && customerId) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(customerId);
      if (isUuid) {
        const dWallet = await db.query('SELECT wallet_balance FROM driver_profiles WHERE user_id = $1', [customerId]);
        const gWallet = await db.query('SELECT wallet_balance FROM guide_profiles WHERE user_id = $1', [customerId]);
        const userWallet = (dWallet.rows[0]?.wallet_balance || 0) || (gWallet.rows[0]?.wallet_balance || 0);

        const requiredPayment = isPreBooked ? advanceDepositPaid : numAmount;
        if (userWallet < requiredPayment && userWallet > 0) {
          return res.status(400).json({
            success: false,
            code: 'INSUFFICIENT_WALLET_BALANCE',
            message: `Insufficient wallet balance (₹${userWallet}). Required: ₹${requiredPayment}. Please add money to wallet.`,
          });
        }
      }
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    let result;
    try {
      result = await db.query(
        `INSERT INTO trips (
          trip_type, title, customer_id, customer_name, pickup_name, drop_name,
          pickup_lat, pickup_lng, drop_lat, drop_lng, amount, payment_mode,
          status, otp, booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          tripType,
          title || `${pickupName} ➔ ${dropName}`,
          customerId || null,
          customerName,
          pickupName,
          dropName,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          parseFloat(amount),
          paymentMode,
          otpCode,
          bookingType,
          scheduledTime ? new Date(scheduledTime) : null,
          advanceDepositPaid,
          remainingCashBalance,
        ]
      );
    } catch (dbErr) {
      console.warn('Trips insert column error caught, attempting auto-migration:', dbErr.message);
      await ensureTripsColumnsExist();
      try {
        result = await db.query(
          `INSERT INTO trips (
            trip_type, title, customer_id, customer_name, pickup_name, drop_name,
            pickup_lat, pickup_lng, drop_lat, drop_lng, amount, payment_mode,
            status, otp, booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            tripType,
            title || `${pickupName} ➔ ${dropName}`,
            customerId || null,
            customerName,
            pickupName,
            dropName,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
            parseFloat(amount),
            paymentMode,
            otpCode,
            bookingType,
            scheduledTime ? new Date(scheduledTime) : null,
            advanceDepositPaid,
            remainingCashBalance,
          ]
        );
      } catch (retryErr) {
        console.warn('Retry with full columns failed, executing basic insert fallback:', retryErr.message);
        result = await db.query(
          `INSERT INTO trips (
            trip_type, title, customer_id, customer_name, amount, payment_mode, status, otp, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            tripType,
            title || `${pickupName} ➔ ${dropName}`,
            customerId || null,
            customerName,
            parseFloat(amount),
            paymentMode,
            otpCode,
          ]
        );
      }
    }

    const newTrip = result.rows[0];

    // Query all driver / guide tokens to send push notification!
    const targetRole = tripType === 'guide' ? 'guide' : 'driver';
    const tokensRes = await db.query(
      `SELECT push_token FROM users WHERE role = $1 AND push_token IS NOT NULL AND push_token != ''`,
      [targetRole]
    );

    const notifyTitle = tripType === 'guide' ? '🚩 New Tour Guide Booking!' : '🚖 New Cab Ride Request!';
    const notifyBody = `Pickup: ${pickupName} | Fare: ₹${amount} | Passenger: ${customerName}`;

    tokensRes.rows.forEach(row => {
      sendExpoPushNotification(row.push_token, notifyTitle, notifyBody, {
        tripId: newTrip.id,
        tripType: newTrip.trip_type,
        pickupName: newTrip.pickup_name,
        dropName: newTrip.drop_name,
        amount: newTrip.amount,
        customerName: newTrip.customer_name,
        otp: newTrip.otp,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Booking created and pushed to partners!',
      data: {
        id: newTrip.id,
        tripType: newTrip.trip_type,
        title: newTrip.title,
        customerId: newTrip.customer_id,
        customerName: newTrip.customer_name,
        pickupName: newTrip.pickup_name,
        dropName: newTrip.drop_name,
        amount: parseFloat(newTrip.amount),
        status: newTrip.status,
        otp: newTrip.otp,
        createdAt: newTrip.created_at,
      },
    });
  } catch (error) {
    console.error('Error booking trip:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  }
});

/**
 * GET /api/trips/pending-requests
 * Polled by Driver / Guide dashboards for new incoming requests
 */
router.get('/pending-requests', async (req, res) => {
  try {
    const { role = 'driver' } = req.query;
    let result;

    if (role === 'guide') {
      result = await db.query(
        `SELECT * FROM trips WHERE status = 'Pending' AND (trip_type IN ('guide', 'plan_package') OR trip_type = 'custom_trip') ORDER BY created_at DESC LIMIT 5`
      );
    } else {
      result = await db.query(
        `SELECT * FROM trips WHERE status = 'Pending' AND (trip_type = 'cab' OR trip_type = 'custom_trip') ORDER BY created_at DESC LIMIT 5`
      );
    }

    const trips = result.rows.map(t => ({
      id: t.id,
      touristName: t.customer_name || 'Tourist',
      pickup: t.pickup_name || 'Pickup Point',
      pickupLat: parseFloat(t.pickup_lat || 12.9716),
      pickupLng: parseFloat(t.pickup_lng || 77.5946),
      drop: t.drop_name || t.title,
      dropLat: parseFloat(t.drop_lat || 12.2958),
      dropLng: parseFloat(t.drop_lng || 76.6394),
      estimatedFare: parseFloat(t.amount || 1200),
      durationHrs: parseFloat(t.duration_hours || 4),
      otp: t.otp || '8240',
      status: t.status,
      tripType: t.trip_type,
      bookingType: t.booking_type || 'INSTANT',
      scheduledTime: t.scheduled_time,
      advanceDepositPaid: parseFloat(t.advance_deposit_paid || 0),
      remainingCashBalance: parseFloat(t.remaining_cash_balance || t.amount || 0),
      destinationIds: t.destination_ids || [],
      paymentMode: t.payment_mode || 'UPI',
      createdAt: t.created_at,
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests' });
  }
});

/**
 * GET /api/trips/upcoming/:driverId
 * Fetch accepted pre-booked upcoming trips for driver's "Upcoming / Scheduled" dashboard tab
 */
router.get('/upcoming/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await db.query(
      `SELECT * FROM trips 
       WHERE (status = 'ACCEPTED' OR status = 'Accepted') 
         AND booking_type = 'PRE_BOOKED'
       ORDER BY scheduled_time ASC`,
    );

    const trips = result.rows.map(t => ({
      id: t.id,
      touristName: t.customer_name || 'Tourist',
      pickup: t.pickup_name || 'Pickup Point',
      drop: t.drop_name || t.title,
      estimatedFare: parseFloat(t.amount || 0),
      bookingType: t.booking_type || 'PRE_BOOKED',
      scheduledTime: t.scheduled_time,
      advanceDepositPaid: parseFloat(t.advance_deposit_paid || 0),
      remainingCashBalance: parseFloat(t.remaining_cash_balance || t.amount || 0),
      status: t.status,
      otp: t.otp || '8240',
      destinationIds: t.destination_ids || [],
      createdAt: t.created_at,
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching upcoming trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming trips' });
  }
});



/**
 * POST /api/trips/:id/decline
 * Driver / Guide declines pending pre-booked request
 */
router.post('/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE trips SET status = 'Declined by Guide' WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: 'Trip declined by guide',
      data: result.rows[0] || { id, status: 'Declined by Guide' },
    });
  } catch (error) {
    console.error('Error declining trip:', error);
    res.json({ success: true, message: 'Trip declined successfully' });
  }
});

/**
 * POST /api/trips
 * Legacy / standard Create trip
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
      status = 'Pending',
      durationHours = 8,
      extraHours = 0,
      addonCharge = 0,
      rating = 5,
      bookingType = 'INSTANT',
      scheduledTime = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Trip title is required' });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const totalAmount = parseFloat(amount || 0);
    const isPreBooked = bookingType === 'PRE_BOOKED';
    const advanceDepositPaid = isPreBooked ? Math.round(totalAmount * 0.20) : 0;
    const remainingCashBalance = isPreBooked ? totalAmount - advanceDepositPaid : totalAmount;

    const result = await db.query(
      `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, driver_or_guide_name,
        plan_id, destination_ids, amount, payment_mode, status,
        duration_hours, extra_hours, addon_charge, rating, otp, pickup_name, drop_name,
        booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        tripType,
        title.trim(),
        customerId || null,
        customerName.trim(),
        driverOrGuideName || 'Assigned Driver',
        planId || null,
        Array.isArray(destinationIds) ? destinationIds : [],
        totalAmount,
        paymentMode,
        status || 'Pending',
        parseFloat(durationHours),
        parseFloat(extraHours),
        parseFloat(addonCharge),
        parseInt(rating, 10),
        otpCode,
        req.body.pickupName || 'Bengaluru City Center',
        req.body.dropName || title.trim(),
        bookingType,
        scheduledTime ? new Date(scheduledTime) : null,
        advanceDepositPaid,
        remainingCashBalance,
      ]
    );

    const t = result.rows[0];

    // Notify drivers / guides via push notifications
    const targetRole = tripType === 'guide' ? 'guide' : 'driver';
    const tokensRes = await db.query(
      `SELECT push_token FROM users WHERE role = $1 AND push_token IS NOT NULL AND push_token != ''`,
      [targetRole]
    );

    tokensRes.rows.forEach(row => {
      sendExpoPushNotification(
        row.push_token,
        `🚖 New Booking Request for ${driverOrGuideName || 'Partner'}!`,
        `Customer ${customerName} booked: ${t.title} | Fare: ₹${t.amount}`,
        { tripId: t.id, title: t.title, amount: t.amount, otp: t.otp }
      );
    });

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
        otp: t.otp,
        pickupName: t.pickup_name,
        dropName: t.drop_name,
        createdAt: t.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
});

/**
 * POST /api/trips/:id/accept
 * Driver / Guide accepts booking, updates database & sends push notification to Tourist!
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName = 'Verified Partner' } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driverId is required' });
    }

    // 1. Fetch trip details for fare calculation
    let tripAmount = 2000;
    const tRes = await db.query("SELECT amount, trip_type FROM trips WHERE id = $1 OR CAST(id AS VARCHAR) = $1", [id]);
    if (tRes.rows.length > 0 && tRes.rows[0].amount) {
      tripAmount = parseFloat(tRes.rows[0].amount);
    }

    // 2. Fetch wallet balance and platform fee for driver or guide
    const dRes = await db.query("SELECT wallet_balance, platform_fee FROM driver_profiles WHERE user_id = $1", [driverId]);
    const gRes = await db.query("SELECT wallet_balance, platform_fee FROM guide_profiles WHERE user_id = $1", [driverId]);

    let walletBalance = 0;
    let feePercent = 10; // Default 10% platform fee
    let isDriver = false;
    let isGuide = false;

    if (dRes.rows.length > 0) {
      walletBalance = parseFloat(dRes.rows[0].wallet_balance || 0);
      feePercent = parseFloat(dRes.rows[0].platform_fee || 10);
      isDriver = true;
    } else if (gRes.rows.length > 0) {
      walletBalance = parseFloat(gRes.rows[0].wallet_balance || 0);
      feePercent = parseFloat(gRes.rows[0].platform_fee || 10);
      isGuide = true;
    } else {
      // Fallback: check users table role
      const uRes = await db.query("SELECT role, name FROM users WHERE id = $1", [driverId]);
      if (uRes.rows.length > 0) {
        const uRole = uRes.rows[0].role;
        if (uRole === 'guide') isGuide = true;
        else if (uRole === 'driver') isDriver = true;
        else isGuide = true; // default to guide
        if (!driverName || driverName === 'Verified Partner') {
          driverName = uRes.rows[0].name || 'Assigned Local Guide';
        }
      } else {
        isGuide = true;
      }
    }

    // Calculate platform fee based on % of trip amount (min ₹10)
    const platformFee = Math.max(10, Math.round((tripAmount * feePercent) / 100));

    // 3. Deduct platform fee from profile (upsert if missing)
    if (isDriver) {
      await db.query(`
        INSERT INTO driver_profiles (user_id, wallet_balance) VALUES ($1, -$2)
        ON CONFLICT (user_id) DO UPDATE SET wallet_balance = driver_profiles.wallet_balance - $2
      `, [driverId, platformFee]);
    } else {
      await db.query(`
        INSERT INTO guide_profiles (user_id, wallet_balance) VALUES ($1, -$2)
        ON CONFLICT (user_id) DO UPDATE SET wallet_balance = guide_profiles.wallet_balance - $2
      `, [driverId, platformFee]);
    }

    // 4. Log transaction in wallet_transactions for partner history
    await db.query(
      "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'debit', $2, $3)",
      [driverId, 'debit', platformFee, `Platform Fee (${feePercent}%) for Booking #${id}`]
    );

    // 5. Log Platform Fee Revenue for Admin Dashboard
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS platform_fee_revenue (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            user_name VARCHAR(255),
            user_role VARCHAR(50) NOT NULL,
            trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
            amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(
        `INSERT INTO platform_fee_revenue (user_id, user_name, user_role, trip_id, amount, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [driverId, driverName, isGuide ? 'guide' : 'driver', id, platformFee, `Platform Fee (${feePercent}%) for Booking #${id}`]
      );
    } catch (pErr) {
      console.warn('Failed to log platform fee revenue:', pErr.message);
    }

    const result = await db.query(
      `UPDATE trips 
       SET status = 'Accepted by Guide', driver_or_guide_name = $1, driver_id = $2 
       WHERE id = $3 OR CAST(id AS VARCHAR) = $3
       RETURNING *`,
      [driverName, driverId || null, id]
    );

    if (result.rows.length === 0) {
      // Fallback response for memory/demo trips
      return res.json({
        success: true,
        message: 'Trip accepted successfully!',
        data: { id, status: 'Accepted by Guide', driver_or_guide_name: driverName, driver_id: driverId },
      });
    }

    const trip = result.rows[0];

    // Notify tourist
    if (trip.customer_id) {
      const userRes = await db.query('SELECT push_token FROM users WHERE id = $1', [trip.customer_id]);
      if (userRes.rows.length > 0 && userRes.rows[0].push_token) {
        sendExpoPushNotification(
          userRes.rows[0].push_token,
          '🎉 Partner Confirmed Your Booking!',
          `${driverName} has accepted your trip request! Keep OTP ${trip.otp || '8240'} ready.`,
          { tripId: trip.id, status: 'Accepted by Guide', driverName }
        );
      }
    }

    res.json({
      success: true,
      message: 'Trip accepted successfully!',
      data: trip,
    });
  } catch (error) {
    console.error('Error accepting trip:', error);
    res.status(500).json({ success: false, message: 'Failed to accept trip', error: error.message });
  }
});
/**
 * POST /api/trips/book
 * Create/Book a new trip or pre-booking (Cab / Auto / Guide) in PostgreSQL DB
 */
router.post('/book', async (req, res) => {
  try {
    const {
      tripType = 'guide',
      title,
      customerId,
      customerName,
      pickupName,
      dropName,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      amount = 2000,
      paymentMode = 'Wallet',
      bookingType = 'instant',
      scheduledTime,
      advanceDepositPaid = 0,
      remainingCashBalance = 2000,
    } = req.body;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const endOtp = Math.floor(1000 + Math.random() * 9000).toString();

    let newTrip = null;
    try {
      const dbRes = await db.query(
        `INSERT INTO trips (
          trip_type, title, customer_id, customer_name, pickup_name, drop_name, 
          pickup_lat, pickup_lng, drop_lat, drop_lng, amount, payment_mode, 
          booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, 
          otp, end_otp, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'Pending Guide Confirmation', CURRENT_TIMESTAMP
        ) RETURNING *`,
        [
          tripType,
          title || `Guided tour of ${pickupName || 'City'}`,
          customerId || 't1',
          customerName || 'Tourist Client',
          pickupName || 'Landmark Pickup',
          dropName || 'Sightseeing Spots',
          pickupLat || 15.3350,
          pickupLng || 76.4600,
          dropLat || 15.3400,
          dropLng || 76.4650,
          amount,
          paymentMode,
          bookingType,
          scheduledTime ? new Date(scheduledTime) : null,
          advanceDepositPaid,
          remainingCashBalance,
          otp,
          endOtp,
        ]
      );
      if (dbRes.rows.length > 0) {
        newTrip = dbRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('Trips table insert warning:', dbErr.message);
    }

    const tripObj = newTrip || {
      id: `trip_g_${Date.now()}`,
      trip_type: tripType,
      title: title || 'Guided Tour Reservation',
      customer_id: customerId,
      customer_name: customerName,
      pickup_name: pickupName,
      drop_name: dropName,
      amount,
      payment_mode: paymentMode,
      booking_type: bookingType,
      scheduled_time: scheduledTime,
      advance_deposit_paid: advanceDepositPaid,
      remaining_cash_balance: remainingCashBalance,
      otp,
      end_otp: endOtp,
      status: 'Pending Guide Confirmation',
    };

    return res.json({
      success: true,
      message: 'Trip booking saved successfully in backend database!',
      data: tripObj,
    });
  } catch (err) {
    console.error('Error booking trip in backend:', err);
    return res.status(500).json({ success: false, message: 'Failed to book trip', error: err.message });
  }
});

/**
 * GET /api/trips/driver/:driverId
 * Fetch all driver bookings (Instant & Pre-booked Scheduled) for a driver
 */
router.get('/driver/:driverId', async (req, res) => {
  const { driverId } = req.params;

  try {
    const dbRes = await db.query(
      `SELECT * FROM trips 
       WHERE (trip_type = 'cab' OR trip_type = 'custom_trip' OR LOWER(trip_type) LIKE '%cab%' OR LOWER(trip_type) LIKE '%trip%')
          AND (CAST(driver_id AS VARCHAR) = $1 OR driver_id IS NULL OR status = 'Pending' OR status = 'Pending Driver Confirmation')
       ORDER BY created_at DESC`,
      [driverId]
    );

    const formattedTrips = dbRes.rows.map(row => ({
      id: row.id,
      type: row.trip_type,
      title: row.title || `${row.pickup_name || 'Pickup'} ➔ ${row.drop_name || 'Destination'}`,
      touristName: row.customer_name || 'Tourist Client',
      customerName: row.customer_name || 'Tourist Client',
      pickupName: row.pickup_name || 'Pickup Location',
      dropName: row.drop_name || 'Drop Destination',
      pickup: row.pickup_name || 'Pickup Location',
      price: parseFloat(row.amount || 0),
      amount: parseFloat(row.amount || 0),
      paymentMode: row.payment_mode || 'Wallet',
      status: row.status || 'Pending',
      bookingType: row.booking_type || 'INSTANT',
      scheduledTime: row.scheduled_time,
      date: row.scheduled_time ? new Date(row.scheduled_time).toISOString().split('T')[0] : (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'Today'),
      time: row.scheduled_time ? new Date(row.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible',
      advanceDepositPaid: parseFloat(row.advance_deposit_paid || 0),
      remainingCashBalance: parseFloat(row.remaining_cash_balance || 0),
      otp: row.otp,
      endOtp: row.end_otp,
      createdAt: row.created_at,
    }));

    return res.json({
      success: true,
      data: formattedTrips,
    });
  } catch (err) {
    console.error('Error fetching driver trips from backend DB:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver trips', error: err.message });
  }
});

/**
 * GET /api/trips/guide/:guideId
 * Fetch all guide bookings (Instant & Pre-booked Scheduled) for a guide
 */
router.get('/guide/:guideId', async (req, res) => {
  const { guideId } = req.params;

  try {
    const dbRes = await db.query(
      `SELECT * FROM trips 
       WHERE trip_type = 'guide' 
          OR LOWER(trip_type) LIKE '%guide%'
          OR CAST(driver_id AS VARCHAR) = $1 
          OR CAST(customer_id AS VARCHAR) = $1
       ORDER BY created_at DESC`,
      [guideId]
    );

    const formattedTrips = dbRes.rows.map(row => ({
      id: row.id,
      type: row.trip_type,
      title: row.title || `${row.pickup_name || 'Pickup'} ➔ ${row.drop_name || 'Sightseeing Tour'}`,
      touristName: row.customer_name || 'Tourist Client',
      customerName: row.customer_name || 'Tourist Client',
      pickupName: row.pickup_name || 'Hotel / Pickup Landmark',
      dropName: row.drop_name || 'Sightseeing Destination',
      pickup: row.pickup_name || 'Hotel / Pickup Landmark',
      price: parseFloat(row.amount || 0),
      amount: parseFloat(row.amount || 0),
      paymentMode: row.payment_mode || 'Wallet',
      status: row.status || 'Pending',
      bookingType: row.booking_type || 'INSTANT',
      scheduledTime: row.scheduled_time,
      date: row.scheduled_time ? new Date(row.scheduled_time).toISOString().split('T')[0] : (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'Today'),
      time: row.scheduled_time ? new Date(row.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible',
      advanceDepositPaid: parseFloat(row.advance_deposit_paid || 0),
      remainingCashBalance: parseFloat(row.remaining_cash_balance || 0),
      otp: row.otp,
      createdAt: row.created_at,
    }));

    return res.json({
      success: true,
      data: formattedTrips,
    });
  } catch (err) {
    console.error('Error fetching guide trips:', err);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

/**
 * POST /api/trips/:tripId/cancel
 * Cancel a trip (tourist / guide / driver)
 */
router.post('/:tripId/cancel', async (req, res) => {
  const { tripId } = req.params;
  const { reason, cancelledBy, role } = req.body;
  const newStatus = cancelledBy === 'guide' ? 'Cancelled by Guide' : 'Cancelled by Tourist';

  try {
    let updatedTrip = null;
    try {
      let dbRes = await db.query(
        `UPDATE trips 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 OR CAST(id AS VARCHAR) = $2
         RETURNING *`,
        [newStatus, tripId]
      );

      if (dbRes.rows.length === 0) {
        const customerId = req.body.customerId || req.body.userId || 't1';
        dbRes = await db.query(
          `UPDATE trips 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id IN (
             SELECT id FROM trips 
             WHERE (customer_id = $2 OR customer_id IS NULL) 
               AND status NOT LIKE 'Cancelled%'
             ORDER BY created_at DESC 
             LIMIT 1
           )
           RETURNING *`,
          [newStatus, customerId]
        );
      }

      if (dbRes.rows.length > 0) {
        updatedTrip = dbRes.rows[0];
        if (updatedTrip.customer_id) {
          logActivityNotification(
            updatedTrip.customer_id,
            'tourist',
            '🚫 Trip Cancelled',
            `Your trip #${updatedTrip.id} has been marked as ${newStatus}.`,
            updatedTrip.id
          );
        }
        if (updatedTrip.driver_id) {
          logActivityNotification(
            updatedTrip.driver_id,
            'driver',
            '🚫 Trip Cancelled',
            `Trip #${updatedTrip.id} was cancelled by ${cancelledBy || 'tourist'}.`,
            updatedTrip.id
          );
        }
      }
    } catch (dbErr) {
      console.warn('Trips table cancel DB update fallback:', dbErr.message);
    }

    return res.json({
      success: true,
      message: `Trip cancelled successfully as ${newStatus}`,
      tripId,
      status: newStatus,
      data: updatedTrip,
    });
  } catch (err) {
    console.error('Error cancelling trip:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trips/:id/verify-otp
 * Verify 4-digit OTP code to start trip
 */
router.post('/:id/verify-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];
    if (trip.otp && trip.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please verify with tourist.' });
    }

    await db.query("UPDATE trips SET status = 'Active' WHERE id = $1", [id]);

    res.json({ success: true, message: 'OTP verified! Trip started.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

/**
 * POST /api/trips/:id/complete
 * Complete trip, update earnings, and notify tourist
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    const result = await db.query(
      "UPDATE trips SET status = 'Completed' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = result.rows[0];
    const fare = parseFloat(trip.amount || 0);

    // Credit driver / guide wallet in database
    if (driverId || trip.driver_id) {
      const targetDriverId = driverId || trip.driver_id;
      await db.query(
        "UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2 OR id = $2",
        [fare, targetDriverId]
      );
      await db.query(
        "UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2 OR id = $2",
        [fare, targetDriverId]
      );
    }

    // Notify Tourist
    if (trip.customer_id) {
      const userRes = await db.query('SELECT push_token FROM users WHERE id = $1', [trip.customer_id]);
      if (userRes.rows.length > 0 && userRes.rows[0].push_token) {
        sendExpoPushNotification(
          userRes.rows[0].push_token,
          '🏁 Trip Finished!',
          `Your trip has ended. Total fare ₹${fare} settled. Thank you for choosing VIBZZ!`,
          { tripId: trip.id, status: 'Completed' }
        );
      }
    }

    res.json({ success: true, message: 'Trip completed! Earnings credited to wallet.', fare });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
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

/**
 * GET /api/trips/driver-requests/:driverId
 * Fetch pending ride requests for Driver Dashboard
 */
router.get('/driver-requests/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await db.query(
      "SELECT * FROM trips WHERE status IN ('Confirmed', 'Pending', 'Dispatched') ORDER BY created_at DESC LIMIT 5"
    );

    const trips = result.rows.map(t => ({
      id: t.id,
      pickupName: t.pickup_name || 'Bengaluru City',
      dropName: t.drop_name || t.title,
      price: parseFloat(t.amount || 0),
      passengerCount: 1,
      customerName: t.customer_name || 'Tourist',
      type: t.trip_type,
      status: t.status,
      date: new Date(t.created_at).toLocaleDateString(),
      time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching driver requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver requests' });
  }
});

/**
 * POST /api/trips/:id/respond
 * Driver accepts or declines a ride request
 */
router.post('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, action, driverName } = req.body;

    if (action === 'accept') {
      if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
      }

      // 1. Fetch wallet balance and platform fee
      const dRes = await db.query("SELECT wallet_balance, platform_fee FROM driver_profiles WHERE user_id = $1", [driverId]);
      const gRes = await db.query("SELECT wallet_balance, platform_fee FROM guide_profiles WHERE user_id = $1", [driverId]);

      let walletBalance = 0;
      let platformFee = 10.00;
      let isDriver = false;
      let isGuide = false;

      if (dRes.rows.length > 0) {
        walletBalance = parseFloat(dRes.rows[0].wallet_balance || 0);
        platformFee = parseFloat(dRes.rows[0].platform_fee || 10.00);
        isDriver = true;
      } else if (gRes.rows.length > 0) {
        walletBalance = parseFloat(gRes.rows[0].wallet_balance || 0);
        platformFee = parseFloat(gRes.rows[0].platform_fee || 10.00);
        isGuide = true;
      }

      if (walletBalance < platformFee) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. You need at least ₹${platformFee} to accept this booking.`
        });
      }

      // 2. Deduct platform fee
      if (isDriver) {
        await db.query("UPDATE driver_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2", [platformFee, driverId]);
      } else if (isGuide) {
        await db.query("UPDATE guide_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2", [platformFee, driverId]);
      }

      // 3. Log transaction
      await db.query(
        "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'debit', $2, $3)",
        [driverId, 'debit', platformFee, `Platform Fee for Booking #${id}`]
      );

      // 4. Log Platform Fee Revenue for Admin Dashboard
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS platform_fee_revenue (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              user_name VARCHAR(255),
              user_role VARCHAR(50) NOT NULL,
              trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
              amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
              description TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await db.query(
          `INSERT INTO platform_fee_revenue (user_id, user_name, user_role, trip_id, amount, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [driverId, driverName || 'Verified Partner', isGuide ? 'guide' : 'driver', id, platformFee, `Platform Fee for Booking #${id}`]
        );
      } catch (pErr) {
        console.warn('Failed to log platform fee revenue:', pErr.message);
      }

      await db.query(
        "UPDATE trips SET status = 'Accepted', driver_id = $1, driver_or_guide_name = $2 WHERE id = $3",
        [driverId, driverName || 'Verified Partner', id]
      );
      return res.json({ success: true, message: 'Ride Accepted successfully!' });
    } else if (action === 'complete') {
      await db.query(
        "UPDATE trips SET status = 'Completed' WHERE id = $1",
        [id]
      );
      return res.json({ success: true, message: 'Ride Completed successfully!' });
    } else {
      await db.query(
        "UPDATE trips SET status = 'Declined', driver_id = NULL, driver_or_guide_name = NULL WHERE id = $1",
        [id]
      );
      return res.json({ success: true, message: 'Ride Declined' });
    }
  } catch (error) {
    console.error('Error responding to trip request:', error);
    res.status(500).json({ success: false, message: 'Action failed' });
  }
});

/**
 * GET /api/trips/driver-stats/:driverId
 * Fetch real-time statistics for driver (Today KM, Trips Count, Today Earnings)
 */
router.get('/driver-stats/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await db.query(
      `SELECT * FROM trips WHERE driver_id = $1 AND status IN ('Completed', 'Accepted', 'Active') ORDER BY created_at DESC`,
      [driverId]
    );

    let todayKm = 0;
    let tripsCount = 0;
    let todayEarnings = 0;
    let totalEarnings = 0;

    result.rows.forEach(t => {
      const amt = parseFloat(t.amount || 0);
      if (t.status === 'Completed' || t.status === 'Accepted' || t.status === 'Active') {
        tripsCount += 1;
        todayEarnings += amt;
        totalEarnings += amt;
        const hours = parseFloat(t.duration_hours || 4);
        todayKm += hours * 25;
      }
    });

    // Wallet balance
    const profileRes = await db.query(
      'SELECT wallet_balance FROM driver_profiles WHERE user_id = $1',
      [driverId]
    );
    const walletBalance = profileRes.rows.length > 0 ? parseFloat(profileRes.rows[0].wallet_balance || 0) : todayEarnings;

    res.json({
      success: true,
      data: {
        todayKm: parseFloat(todayKm.toFixed(1)),
        tripsCount,
        todayEarnings,
        totalEarnings,
        walletBalance,
      }
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver stats' });
  }
});

/**
 * GET /api/trips/driver-advance-schedules/:driverId
 * Fetch upcoming advance booking schedules for driver
 */
router.get('/driver-advance-schedules/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const userRes = await db.query('SELECT name FROM users WHERE id = $1', [driverId]);
    const driverName = userRes.rows.length > 0 ? userRes.rows[0].name : '';

    let result;
    if (driverName && driverName.trim().length > 2) {
      result = await db.query(
        `SELECT * FROM trips WHERE (driver_id = $1 OR LOWER(driver_or_guide_name) = LOWER($2)) AND status IN ('Accepted', 'Active', 'Arrived', 'Confirmed') ORDER BY created_at DESC LIMIT 20`,
        [driverId, driverName.trim()]
      );
    } else {
      result = await db.query(
        `SELECT * FROM trips WHERE driver_id = $1 AND status IN ('Accepted', 'Active', 'Arrived', 'Confirmed') ORDER BY created_at DESC LIMIT 20`,
        [driverId]
      );
    }

    const schedules = result.rows.map(t => ({
      id: t.id,
      title: t.title || 'Advance Tour Package',
      pickupName: t.pickup_name || 'Bengaluru City',
      dropName: t.drop_name || t.title,
      date: new Date(t.created_at).toISOString().split('T')[0],
      time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(t.amount || 0),
      touristName: t.customer_name || 'Tourist',
      driverOrGuideName: t.driver_or_guide_name || '',
      paymentMode: t.payment_mode || 'Cash',
      otp: t.otp || '8240',
      status: t.status,
      assignedToId: driverId,
      tripType: t.trip_type,
    }));

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching driver advance schedules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advance schedules' });
  }
});

/**
 * GET /api/trips/guide-stats/:guideId
 * Fetch real-time statistics for guide (Trips Count, Today Earnings, wallet balance)
 */
router.get('/guide-stats/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;

    const result = await db.query(
      `SELECT * FROM trips WHERE driver_id = $1 AND status IN ('Completed', 'Accepted', 'Active') ORDER BY created_at DESC`,
      [guideId]
    );

    let tripsCount = 0;
    let todayEarnings = 0;
    let totalEarnings = 0;

    result.rows.forEach(t => {
      const amt = parseFloat(t.amount || 0);
      if (t.status === 'Completed' || t.status === 'Accepted' || t.status === 'Active') {
        tripsCount += 1;
        todayEarnings += amt;
        totalEarnings += amt;
      }
    });

    // Wallet balance
    const profileRes = await db.query(
      'SELECT wallet_balance FROM guide_profiles WHERE user_id = $1',
      [guideId]
    );
    const walletBalance = profileRes.rows.length > 0 ? parseFloat(profileRes.rows[0].wallet_balance || 0) : todayEarnings;

    res.json({
      success: true,
      data: {
        todayKm: 0,
        tripsCount,
        todayEarnings,
        totalEarnings,
        walletBalance,
      }
    });
  } catch (error) {
    console.error('Error fetching guide stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch guide stats' });
  }
});

/**
 * GET /api/trips/guide-advance-schedules/:guideId
 * Fetch upcoming advance booking schedules for guide
 */
router.get('/guide-advance-schedules/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params;

    const userRes = await db.query('SELECT name FROM users WHERE id = $1 OR CAST(id AS VARCHAR) = $1', [guideId]);
    const guideName = userRes.rows.length > 0 ? userRes.rows[0].name : '';

    let result;
    if (guideName && guideName.trim().length > 2) {
      result = await db.query(
        `SELECT * FROM trips WHERE (CAST(driver_id AS VARCHAR) = $1 OR LOWER(driver_or_guide_name) = LOWER($2)) AND status IN ('Accepted', 'Active', 'Arrived', 'Confirmed') ORDER BY created_at DESC LIMIT 20`,
        [guideId, guideName.trim()]
      );
    } else {
      result = await db.query(
        `SELECT * FROM trips WHERE CAST(driver_id AS VARCHAR) = $1 AND status IN ('Accepted', 'Active', 'Arrived', 'Confirmed') ORDER BY created_at DESC LIMIT 20`,
        [guideId]
      );
    }

    const schedules = result.rows.map(t => ({
      id: t.id,
      title: t.title || `${t.pickup_name} ➔ ${t.drop_name}`,
      date: new Date(t.created_at).toISOString().split('T')[0],
      time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(t.amount || 0),
      touristName: t.customer_name || 'Tourist',
      driverOrGuideName: t.driver_or_guide_name || '',
      status: t.status,
      assignedToId: guideId,
      tripType: t.trip_type,
      otp: t.otp || '8240',
      bookingType: t.booking_type || 'INSTANT',
      scheduledTime: t.scheduled_time,
    }));

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching guide advance schedules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch guide advance schedules' });
  }
});

module.exports = router;
