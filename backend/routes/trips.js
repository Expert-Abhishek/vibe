const express = require('express');
const db = require('../config/db');

const router = express.Router();

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

    const result = await db.query(
      `SELECT * FROM activity_notifications 
       WHERE (user_id = $1 OR user_id IS NULL) 
         AND (role = $2 OR role = 'all')
       ORDER BY created_at DESC LIMIT 50`,
      [userId, role]
    );

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
 * POST /api/trips/:id/arrive
 * Driver taps "Arrived at Pickup"
 */
router.post('/:id/arrive', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName = 'Captain' } = req.body;

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
    } = req.body;

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const result = await db.query(
      `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, pickup_name, drop_name,
        pickup_lat, pickup_lng, drop_lat, drop_lng, amount, payment_mode,
        status, otp, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', $13, CURRENT_TIMESTAMP)
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
      ]
    );

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
    const targetType = role === 'guide' ? 'guide' : 'cab';

    const result = await db.query(
      `SELECT * FROM trips WHERE status = 'Pending' AND (trip_type = $1 OR trip_type = 'custom_trip') ORDER BY created_at DESC LIMIT 5`,
      [targetType]
    );

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
      createdAt: t.created_at,
    }));

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests' });
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
      status = 'Completed',
      durationHours = 8,
      extraHours = 0,
      addonCharge = 0,
      rating = 5,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Trip title is required' });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const result = await db.query(
      `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, driver_or_guide_name,
        plan_id, destination_ids, amount, payment_mode, status,
        duration_hours, extra_hours, addon_charge, rating, otp, pickup_name, drop_name
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        tripType,
        title.trim(),
        customerId || null,
        customerName.trim(),
        driverOrGuideName || 'Assigned Driver',
        planId || null,
        Array.isArray(destinationIds) ? destinationIds : [],
        parseFloat(amount),
        paymentMode,
        status || 'Pending',
        parseFloat(durationHours),
        parseFloat(extraHours),
        parseFloat(addonCharge),
        parseInt(rating, 10),
        otpCode,
        req.body.pickupName || 'Bengaluru City Center',
        req.body.dropName || title.trim(),
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

    const result = await db.query(
      `UPDATE trips 
       SET status = 'Accepted', driver_or_guide_name = $1, driver_id = $2 
       WHERE id = $3 
       RETURNING *`,
      [driverName, driverId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip booking not found' });
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
          { tripId: trip.id, status: 'Accepted', driverName }
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

module.exports = router;
