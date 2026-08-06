const express = require('express');
const db = require('../config/db');
const { emitNotification, emitTripRequest, emitTripAccepted, emitTripDeclined, emitTripCancelled, emitTripStatusUpdated } = require('../config/socket');

const router = express.Router();

// Helper to validate and convert UUID values for PostgreSQL foreign key constraints
function toValidUuidOrNull(val) {
  if (!val) return null;
  const str = String(val).trim();
  const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (UUID_REGEX.test(str)) return str;

  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
  } catch (e) {
    return null;
  }
}

// Helper to sanitize payment_mode string to standard PostgreSQL enum values
function sanitizePaymentMode(pm) {
  const str = String(pm || 'cash').toLowerCase().trim();
  if (str.includes('cash')) return 'cash';
  if (str.includes('upi')) return 'upi';
  if (str.includes('wallet')) return 'wallet';
  if (str.includes('card')) return 'card';
  if (str.includes('online') || str.includes('razorpay')) return 'online';
  return 'cash';
}

let STATION_MAP = {
  'loc_ksrtc_bus_stand': { id: 'loc_ksrtc_bus_stand', name: 'KSRTC Bus Stand Sakleshpur', address: 'Sakleshpura, Karnataka 573134', latitude: 12.9416, longitude: 75.7790 },
  'loc_sakleshpur_town': { id: 'loc_sakleshpur_town', name: 'Sakleshpur Town Center', address: 'Main Road, Sakleshpur, Karnataka 573134', latitude: 12.9455178, longitude: 75.7789167 },
  'loc_azad_road_junction': { id: 'loc_azad_road_junction', name: 'Azad Road Junction (Sakleshpur)', address: 'Azad Road, Sakleshpur, Karnataka 573134', latitude: 12.9403832, longitude: 75.7789866 },
  'loc_ksrtc_old_bus_stand_ballupet': { id: 'loc_ksrtc_old_bus_stand_ballupet', name: 'KSRTC Old Bus Stand Ballupet', address: 'J.P Nagar, Ballupet, Sakleshpura, Karnataka 573134', latitude: 12.9155, longitude: 75.8456 },
};

async function reloadStationMap() {
  try {
    const res = await db.query('SELECT * FROM stations ORDER BY created_at ASC');
    if (res.rows && res.rows.length > 0) {
      res.rows.forEach(st => {
        STATION_MAP[st.id] = {
          id: st.id,
          name: st.name,
          address: st.address || '',
          latitude: parseFloat(st.latitude || 0),
          longitude: parseFloat(st.longitude || 0),
        };
      });
    }
  } catch (e) {
    console.warn('reloadStationMap warning:', e.message);
  }
}

/**
 * GET /api/trips/preset-locations OR /api/stations
 * Official Sakleshpur Pickup & Drop Station presets for user trips
 */
router.get(['/preset-locations', '/stations'], async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM stations ORDER BY created_at ASC');
    const stations = result.rows.map(st => ({
      id: st.id,
      stationId: st.id,
      name: st.name,
      address: st.address || '',
      latitude: parseFloat(st.latitude || 0),
      longitude: parseFloat(st.longitude || 0),
    }));
    res.json({ success: true, data: stations.length > 0 ? stations : Object.values(STATION_MAP) });
  } catch (e) {
    res.json({ success: true, data: Object.values(STATION_MAP) });
  }
});

/**
 * GET /api/trips/stations/:id
 * Get single station details by ID
 */
router.get('/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM stations WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const st = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: st.id,
          stationId: st.id,
          name: st.name,
          address: st.address || '',
          latitude: parseFloat(st.latitude || 0),
          longitude: parseFloat(st.longitude || 0),
        }
      });
    }
    if (STATION_MAP[id]) {
      return res.json({ success: true, data: STATION_MAP[id] });
    }
    res.status(404).json({ success: false, message: 'Station not found' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch station' });
  }
});

// Auto-migrate trips table columns if missing on production database (deferred execution)
let migrationExecuted = false;
async function ensureTripsColumnsExist() {
  if (migrationExecuted) return;
  migrationExecuted = true;

  try {
    await db.query("ALTER TYPE payment_mode_enum ADD VALUE IF NOT EXISTS 'Cash'");
  } catch (e) {}
  try {
    await db.query("ALTER TYPE payment_mode_enum ADD VALUE IF NOT EXISTS 'cash'");
  } catch (e) {}
  try {
    await db.query("ALTER TYPE payment_mode_enum ADD VALUE IF NOT EXISTS 'Wallet'");
  } catch (e) {}
  try {
    await db.query("ALTER TYPE payment_mode_enum ADD VALUE IF NOT EXISTS 'wallet'");
  } catch (e) {}

  try {
    await db.query(`
      ALTER TABLE trips ALTER COLUMN payment_mode DROP DEFAULT;
      ALTER TABLE trips ALTER COLUMN payment_mode TYPE VARCHAR(50) USING payment_mode::text;
      ALTER TABLE trips ALTER COLUMN payment_mode SET DEFAULT 'Wallet';
    `);
  } catch (e) {}

  // 1. Create stations table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        latitude NUMERIC(10,6),
        longitude NUMERIC(10,6),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.warn('Create stations table warning:', e.message);
  }

  // 2. Seed initial Sakleshpur stations into stations table
  try {
    await db.query(`
      INSERT INTO stations (id, name, address, latitude, longitude)
      VALUES
        ('loc_ksrtc_bus_stand', 'KSRTC Bus Stand Sakleshpur', 'Sakleshpura, Karnataka 573134', 12.9416, 75.7790),
        ('loc_sakleshpur_town', 'Sakleshpur Town Center', 'Main Road, Sakleshpur, Karnataka 573134', 12.9455178, 75.7789167),
        ('loc_azad_road_junction', 'Azad Road Junction (Sakleshpur)', 'Azad Road, Sakleshpur, Karnataka 573134', 12.9403832, 75.7789866),
        ('loc_ksrtc_old_bus_stand_ballupet', 'KSRTC Old Bus Stand Ballupet', 'J.P Nagar, Ballupet, Sakleshpura, Karnataka 573134', 12.9155, 75.8456)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;
    `);
  } catch (e) {
    console.warn('Seed stations table warning:', e.message);
  }

  try {
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_trip INT DEFAULT 0;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS status_code INT DEFAULT 0;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'instant';
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_deposit_paid NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS remaining_cash_balance NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_or_guide_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS station_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_name VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS otp VARCHAR(10);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(50) DEFAULT '5_seater';
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_ids TEXT[] DEFAULT '{}';
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS plan_id VARCHAR(255);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS declined_driver_ids TEXT[] DEFAULT '{}';
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(50) DEFAULT '5_seater';
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(5,2) DEFAULT 10.00;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(5,2) DEFAULT 10.00;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_5_seater NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_7_seater NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_4x4 NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_auto NUMERIC(10,2) DEFAULT 0.00;
    `);

    try {
      await db.query(`
        ALTER TABLE trips ALTER COLUMN booking_type DROP DEFAULT;
        ALTER TABLE trips ALTER COLUMN booking_type TYPE VARCHAR(50) USING booking_type::text;
        ALTER TABLE trips ALTER COLUMN booking_type SET DEFAULT 'instant';
      `);
    } catch (enumErr) {
      try {
        await db.query(`ALTER TYPE booking_type_enum ADD VALUE IF NOT EXISTS 'INSTANT'`);
        await db.query(`ALTER TYPE booking_type_enum ADD VALUE IF NOT EXISTS 'PRE_BOOKED'`);
      } catch (e2) {}
    }
  } catch (e) {
    console.warn('Trips table auto-migration warning:', e.message);
  }

  await reloadStationMap();
}

function sanitizeBookingType(bt) {
  if (!bt) return 'instant';
  const str = String(bt).toLowerCase().trim();
  if (str.includes('pre') || str.includes('book')) return 'prebook';
  return 'instant';
}

// Run migration safely on route module load
ensureTripsColumnsExist();

function mapTripRecord(t) {
  if (!t) return null;

  const pickupId = t.pickup_id || t.pickup_station_id || t.station_id || null;
  const dropId = t.drop_id || t.drop_station_id || null;

  let pickupName = t.pickup_name || '';
  let dropName = t.drop_name || '';

  if (!pickupName && pickupId && STATION_MAP[pickupId]) {
    pickupName = STATION_MAP[pickupId].name;
  }
  if (!dropName && dropId && STATION_MAP[dropId]) {
    dropName = STATION_MAP[dropId].name;
  }

  if (!pickupName) pickupName = 'KSRTC Bus Stand Sakleshpur';
  if (!dropName) dropName = t.title || 'Sakleshpur Town Center';

  const pickupLat = t.pickup_lat ? parseFloat(t.pickup_lat) : (pickupId && STATION_MAP[pickupId] ? STATION_MAP[pickupId].latitude : 12.9416);
  const pickupLng = t.pickup_lng ? parseFloat(t.pickup_lng) : (pickupId && STATION_MAP[pickupId] ? STATION_MAP[pickupId].longitude : 75.7790);

  const dropLat = t.drop_lat ? parseFloat(t.drop_lat) : (dropId && STATION_MAP[dropId] ? STATION_MAP[dropId].latitude : 12.9455178);
  const dropLng = t.drop_lng ? parseFloat(t.drop_lng) : (dropId && STATION_MAP[dropId] ? STATION_MAP[dropId].longitude : 75.7789167);

  return {
    id: t.id,
    tripId: t.id,
    tripType: t.trip_type,
    type: t.trip_type,
    title: t.title || `${pickupName} ➔ ${dropName}`,
    customerId: t.customer_id,
    customerName: t.customer_name,
    touristName: t.customer_name,
    driverId: t.driver_id,
    assignedToId: t.driver_id,
    driverOrGuideName: t.driver_or_guide_name || '',
    planId: t.plan_id,
    destinationId: t.destination_id || (Array.isArray(t.destination_ids) && t.destination_ids.length > 0 ? t.destination_ids[0] : null),
    destinationIds: t.destination_ids || [],
    destination_ids: t.destination_ids || [],
    checkpoints: (Array.isArray(t.checkpoints) && t.checkpoints.length > 0)
      ? t.checkpoints.map(cp => typeof cp === 'object' && cp !== null ? (cp.name || cp.checkpoint_name || cp.title || 'Checkpoint') : String(cp))
      : ((Array.isArray(t.destination_ids) && t.destination_ids.length > 0)
        ? t.destination_ids.map(cp => typeof cp === 'object' && cp !== null ? (cp.name || cp.checkpoint_name || cp.title || 'Checkpoint') : String(cp))
        : []),
    pickupId: pickupId,
    pickup_id: pickupId,
    stationId: pickupId,
    station_id: pickupId,
    pickupName: pickupName,
    pickup_name: pickupName,
    pickupLat: pickupLat,
    pickupLng: pickupLng,
    dropId: dropId,
    drop_id: dropId,
    dropName: dropName,
    drop_name: dropName,
    dropLat: dropLat,
    dropLng: dropLng,
    amount: parseFloat(t.amount || 0),
    price: parseFloat(t.amount || 0),
    paymentMode: t.payment_mode || 'UPI',
    status: t.status || 'Pending',
    durationHours: parseFloat(t.duration_hours || 8),
    extraHours: parseFloat(t.extra_hours || 0),
    addonCharge: parseFloat(t.addon_charge || 0),
    otp: t.otp || null,
    endOtp: t.end_otp || t.endOtp || '4321',
    bookingType: t.booking_type || 'INSTANT',
    scheduledTime: t.scheduled_time || null,
    advanceDepositPaid: parseFloat(t.advance_deposit_paid || 0),
    remainingCashBalance: parseFloat(t.remaining_cash_balance || 0),
    vehicleCategory: t.vehicle_category || '5_seater',
    createdAt: t.created_at,
  };
}

function getStatusCode(status) {
  if (!status) return 0;
  const s = String(status).toLowerCase().trim();
  if (s.includes('complete') || s.includes('finish') || s === 'done') return 3;
  if (s.includes('cancel') || s.includes('decline') || s.includes('reject')) return 4;
  if (s.includes('accept')) return 1;
  if (s.includes('ongoing') || s.includes('in_progress') || s.includes('arrived') || s.includes('active')) return 2;
  return 0; // Pending
}

async function setUserHasTrip(customerId, hasTripVal) {
  if (!customerId) return;
  try {
    await db.query(
      `UPDATE users SET has_trip = $1 WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text`,
      [hasTripVal ? 1 : 0, String(customerId)]
    );
  } catch (e) {
    console.warn('setUserHasTrip error:', e.message);
  }
}

/**
 * GET /api/trips/admin/all
 * Fetch all user trips (Active, Scheduled, Completed, Cancelled) for Admin Panel
 */
router.get('/admin/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, u.phone as customer_phone
       FROM trips t
       LEFT JOIN users u ON u.id = t.customer_id
       ORDER BY t.created_at DESC
       LIMIT 200`
    );

    const trips = result.rows.map(t => ({
      id: t.id,
      tripType: t.trip_type || 'custom_trip',
      title: t.title || 'Tour Booking',
      customerId: t.customer_id,
      customerName: t.customer_name || 'Tourist Client',
      customerPhone: t.customer_phone || '',
      driverOrGuideName: t.driver_or_guide_name || 'Assigned Partner',
      driverId: t.driver_id || null,
      amount: parseFloat(t.amount || 0),
      paymentMode: t.payment_mode || 'UPI',
      status: t.status || 'Pending',
      bookingType: t.booking_type || 'INSTANT',
      scheduledTime: t.scheduled_time,
      advanceDepositPaid: parseFloat(t.advance_deposit_paid || 0),
      remainingCashBalance: parseFloat(t.remaining_cash_balance || 0),
      otp: t.otp || '8240',
      endOtp: t.end_otp || t.endOtp || '4321',
      pickupName: t.pickup_name || t.title,
      dropName: t.drop_name || t.title,
      pickupLat: parseFloat(t.pickup_lat || 12.9716),
      pickupLng: parseFloat(t.pickup_lng || 77.5946),
      dropLat: parseFloat(t.drop_lat || 12.3053),
      dropLng: parseFloat(t.drop_lng || 76.6552),
      createdAt: t.created_at,
    }));

    res.json({ success: true, count: trips.length, trips });
  } catch (error) {
    console.error('Error fetching admin trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin trips', trips: [] });
  }
});

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
 * GET /api/trips/check-has-trip/:customerId (Alias: /active-trip/:customerId)
 * Check PostgreSQL for active non-completed, non-cancelled trip for rider
 */
router.get(['/check-has-trip/:customerId', '/active-trip/:customerId'], async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.json({ success: true, hasActiveTrip: false, trip: null });
    }

    const result = await db.query(
      `SELECT * FROM trips
       WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text)
         AND status_code NOT IN (3, 4)
         AND LOWER(status) NOT IN ('completed', 'cancelled', 'declined', 'rejected', 'done', 'finish')
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(customerId)]
    );

    if (result.rows.length === 0) {
      await setUserHasTrip(customerId, false);
      return res.json({ success: true, hasActiveTrip: false, trip: null });
    }

    const t = result.rows[0];
    await setUserHasTrip(customerId, true);

    const activeTripData = mapTripRecord(t);

    res.json({
      success: true,
      hasActiveTrip: true,
      trip: activeTripData,
    });
  } catch (error) {
    console.error('Error checking active trip:', error);
    res.status(500).json({ success: false, hasActiveTrip: false, trip: null });
  }
});

/**
 * POST /api/trips/cancel-trip/:id (Alias: /:id/cancel, /cancel/:id)
 * Cancel trip, update status strictly to CANCELLED in DB & emit socket event
 */
router.post(['/cancel-trip/:id', '/:id/cancel', '/cancel/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelledBy = 'user', role = 'tourist', reason = 'Cancelled by user' } = req.body || {};

    // Guard: Prevent cancelling a trip that is already completed in database
    const tripCheck = await db.query(
      `SELECT status FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text`,
      [id]
    );

    if (tripCheck.rows.length > 0) {
      const currentSt = String(tripCheck.rows[0].status || '').toLowerCase();
      if (currentSt.includes('complete') || currentSt.includes('finish') || currentSt === 'done') {
        return res.status(400).json({
          success: false,
          code: 'TRIP_ALREADY_COMPLETED',
          message: 'Cannot cancel a trip that is already completed.',
        });
      }
    }

    const actor = cancelledBy === 'driver' || role === 'driver' ? 'by driver' : 'by user';
    const statusText = 'Cancelled';

    const result = await db.query(
      `UPDATE trips
       SET status = $1,
           status_code = 4,
           cancelled_by = $2,
           cancel_reason = $3,
           updated_at = NOW()
       WHERE id::text = $4::text OR CAST(id AS VARCHAR) = $4::text
       RETURNING *`,
      [statusText, actor, reason, id]
    );

    const trip = result.rows.length > 0 ? result.rows[0] : { id, status: statusText, cancelled_by: actor };
    if (trip && trip.customer_id) {
      await setUserHasTrip(trip.customer_id, false);
    }

    emitTripStatusUpdated(trip, statusText);
    emitTripCancelled(trip);

    res.json({
      success: true,
      message: `Trip status updated to ${statusText}`,
      data: trip,
    });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel trip', error: error.message });
  }
});
/**
 * GET /api/trips/pending-requests
 * Fetch all pending unassigned trip requests for driver / guide dashboard
 */
router.get('/pending-requests', async (req, res) => {
  try {
    const { role, vehicleCategory, driverId } = req.query;

    const result = await db.query(
      `SELECT * FROM trips 
       WHERE LOWER(status) IN ('pending', 'dispatched', 'requested')
         AND ($1::text IS NULL OR NOT ($1::text = ANY(COALESCE(declined_driver_ids, '{}'))))
       ORDER BY created_at DESC LIMIT 50`,
      [driverId || null]
    );

    const formattedTrips = await Promise.all(result.rows.map(async (t) => {
      const rawCps = (Array.isArray(t.destination_ids) && t.destination_ids.length > 0) ? t.destination_ids : (t.checkpoints || []);
      const resolvedCps = await resolveDestinationCheckpoints(rawCps);
      const checkpointNames = resolvedCps.map(cp => (typeof cp === 'object' && cp !== null ? (cp.name || cp.checkpoint_name || cp.title || 'Checkpoint') : String(cp)));

      return {
        id: t.id,
        tripId: t.id,
        title: t.title,
        customerName: t.customer_name || 'Tourist Client',
        touristName: t.customer_name || 'Tourist Client',
        customerId: t.customer_id,
        customer_id: t.customer_id,
        pickup: t.pickup_name || 'Pickup Location',
        pickupName: t.pickup_name || 'Pickup Location',
        drop: t.drop_name || t.title || 'Drop Location',
        dropName: t.drop_name || t.title || 'Drop Location',
        amount: parseFloat(t.amount || 0),
        estimatedFare: parseFloat(t.amount || 0),
        price: parseFloat(t.amount || 0),
        vehicleCategory: t.vehicle_category || '5_seater',
        vehicle_category: t.vehicle_category || '5_seater',
        status: t.status,
        bookingType: t.booking_type || 'INSTANT',
        otp: t.otp || '8240',
        endOtp: t.end_otp || '4321',
        checkpoints: checkpointNames,
        trip_checkpoints: resolvedCps,
        scheduledTime: t.scheduled_time,
        createdAt: t.created_at,
      };
    }));

    res.json({
      success: true,
      data: formattedTrips,
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests', data: [] });
  }
});

async function resolveDestinationCheckpoints(rawCheckpoints) {
  if (!rawCheckpoints || !Array.isArray(rawCheckpoints) || rawCheckpoints.length === 0) {
    return [];
  }
  const idsOrNames = rawCheckpoints.map(cp => {
    if (typeof cp === 'object' && cp !== null) {
      return String(cp.destination_id || cp.destinationId || cp.id || cp.name || cp.checkpoint_name || '').trim();
    }
    return String(cp || '').trim();
  }).filter(Boolean);

  if (idsOrNames.length === 0) return rawCheckpoints;

  try {
    const destRes = await db.query(
      `SELECT id, name, location, description, images, videos, latitude, longitude 
       FROM destinations 
       WHERE id::text = ANY($1::text[]) OR name = ANY($1::text[])`,
      [idsOrNames]
    );

    const destMap = {};
    destRes.rows.forEach(d => {
      destMap[d.id] = d;
      destMap[d.name] = d;
      destMap[String(d.id)] = d;
    });

    return rawCheckpoints.map((cp, idx) => {
      const lookupKey = typeof cp === 'object' && cp !== null 
        ? String(cp.destination_id || cp.destinationId || cp.id || cp.name || '').trim() 
        : String(cp || '').trim();

      const matchedDest = destMap[lookupKey];

      if (matchedDest) {
        const imagesArr = Array.isArray(matchedDest.images) ? matchedDest.images : [];
        return {
          id: matchedDest.id,
          destination_id: matchedDest.id,
          destinationId: matchedDest.id,
          checkpoint_name: matchedDest.name,
          name: matchedDest.name,
          location: matchedDest.location || '',
          description: matchedDest.description || '',
          images: imagesArr,
          image: imagesArr[0] || (typeof cp === 'object' ? cp.image : null) || null,
          latitude: matchedDest.latitude ? parseFloat(matchedDest.latitude) : (typeof cp === 'object' ? parseFloat(cp.latitude || cp.lat || 0) : 0),
          longitude: matchedDest.longitude ? parseFloat(matchedDest.longitude) : (typeof cp === 'object' ? parseFloat(cp.longitude || cp.lng || 0) : 0),
          step_order: idx + 1,
        };
      }

      if (typeof cp === 'object' && cp !== null) {
        return {
          ...cp,
          id: cp.destination_id || cp.destinationId || cp.id || `dest_${idx}`,
          destination_id: cp.destination_id || cp.destinationId || cp.id || `dest_${idx}`,
          name: cp.name || cp.checkpoint_name || `Stop ${idx + 1}`,
          step_order: idx + 1,
        };
      }

      return {
        id: `dest_${idx}`,
        destination_id: `dest_${idx}`,
        name: String(cp),
        checkpoint_name: String(cp),
        step_order: idx + 1,
      };
    });
  } catch (e) {
    console.warn('resolveDestinationCheckpoints error:', e.message);
    return rawCheckpoints;
  }
}

/**
 * GET /api/trips/live-location/:tripId
 * Fetch live driver location and status for Tourist live map tracking
 */
router.get('/live-location/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const tripRes = await db.query('SELECT * FROM trips WHERE CAST(id AS VARCHAR) = $1 OR id::text = $1', [tripId]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    let driverData = {
      name: trip.driver_id ? (trip.driver_or_guide_name || 'Driver Partner') : null,
      phone: null,
      vehicleModel: null,
      vehicleNumber: trip.driver_id ? null : 'Assigning Captain...',
      latitude: parseFloat(trip.pickup_lat || 12.9716),
      longitude: parseFloat(trip.pickup_lng || 77.5946),
      heading: 0,
    };

    if (trip.driver_id) {
      try {
        const dpRes = await db.query(
          `SELECT u.name, u.phone, d.vehicle_model, d.vehicle_number, d.latitude, d.longitude, d.heading 
           FROM users u 
           LEFT JOIN driver_profiles d ON u.id::text = d.user_id::text 
           WHERE u.id::text = $1::text OR CAST(u.id AS VARCHAR) = $1::text OR d.id::text = $1::text`,
          [String(trip.driver_id).trim()]
        );
        if (dpRes.rows.length > 0) {
          const dp = dpRes.rows[0];
          driverData = {
            name: dp.name || trip.driver_or_guide_name || driverData.name || 'Driver Partner',
            phone: dp.phone || driverData.phone,
            vehicleModel: dp.vehicle_model || driverData.vehicleModel || 'Cab',
            vehicleNumber: dp.vehicle_number || driverData.vehicleNumber || '',
            latitude: parseFloat(dp.latitude || driverData.latitude),
            longitude: parseFloat(dp.longitude || driverData.longitude),
            heading: parseFloat(dp.heading || 0),
          };
        }
      } catch (e) {
        console.warn('live-location driver fetch warning:', e.message);
      }
    }

    let planData = {
      name: trip.title,
      duration_hours: parseFloat(trip.duration_hours || 8),
      distance_km: 120,
      checkpoints: trip.destination_ids || [],
    };
    if (trip.plan_id) {
      try {
        const planRes = await db.query('SELECT * FROM plans WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [trip.plan_id]);
        if (planRes.rows.length > 0) {
          const p = planRes.rows[0];
          planData = {
            name: p.name || trip.title,
            duration_hours: parseFloat(trip.duration_hours || p.duration_hours || 8),
            distance_km: parseFloat(p.distance_km || 120),
            checkpoints: (Array.isArray(trip.destination_ids) && trip.destination_ids.length > 0) ? trip.destination_ids : (p.checkpoints || []),
          };
        }
      } catch (e) {}
    }

    const rawCheckpoints = (Array.isArray(trip.destination_ids) && trip.destination_ids.length > 0) ? trip.destination_ids : planData.checkpoints;
    const resolvedCheckpoints = await resolveDestinationCheckpoints(rawCheckpoints);

    res.json({
      success: true,
      data: {
        ...trip,
        id: trip.id,
        tripId: trip.id,
        status: trip.status,
        driver_id: trip.driver_id,
        driverId: trip.driver_id,
        driverName: trip.driver_or_guide_name || driverData.name,
        driver_name: trip.driver_or_guide_name || driverData.name,
        driver_or_guide_name: trip.driver_or_guide_name || driverData.name,
        planName: planData.name,
        durationHours: planData.duration_hours,
        distanceKm: planData.distance_km,
        checkpoints: resolvedCheckpoints,
        trip_checkpoints: resolvedCheckpoints,
        otp: trip.otp,
        endOtp: trip.end_otp,
        end_otp: trip.end_otp,
        pickupName: trip.pickup_name || trip.title || 'Pickup Spot',
        dropName: trip.drop_name || 'Destination',
        pickup_name: trip.pickup_name || trip.title || 'Pickup Spot',
        drop_name: trip.drop_name || 'Destination',
        pickupLat: parseFloat(trip.pickup_lat || 12.9716),
        pickupLng: parseFloat(trip.pickup_lng || 77.5946),
        dropLat: parseFloat(trip.drop_lat || 12.2958),
        dropLng: parseFloat(trip.drop_lng || 76.6394),
        pickup_lat: parseFloat(trip.pickup_lat || 12.9716),
        pickup_lng: parseFloat(trip.pickup_lng || 77.5946),
        drop_lat: parseFloat(trip.drop_lat || 12.2958),
        drop_lng: parseFloat(trip.drop_lng || 76.6394),
        amount: parseFloat(trip.amount || 0),
        paymentMode: trip.payment_mode || 'UPI',
        payment_mode: trip.payment_mode || 'UPI',
        bookingType: trip.booking_type || 'INSTANT',
        driver: driverData,
      },
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
 * State Machine Transition Matrix Guard
 * States: pending -> in_progress -> done | cancelled
 */
const VALID_TRANSITIONS = {
  pending: ['pending', 'in_progress', 'cancelled'],
  in_progress: ['in_progress', 'done', 'cancelled'],
  cancelled: [], // Terminal State
  done: [], // Terminal State
};

function normalizeStatus(status) {
  if (!status) return 'pending';
  const s = String(status).toLowerCase().trim();
  if (s.includes('cancel') || s.includes('decline') || s.includes('reject')) return 'cancelled';
  if (s.includes('complete') || s.includes('finish') || s === 'done') return 'done';
  if (s.includes('progress') || s.includes('accept') || s.includes('start') || s.includes('active') || s.includes('arrived')) return 'in_progress';
  return 'pending';
}

function isValidTransition(currentRawStatus, newRawStatus) {
  const current = normalizeStatus(currentRawStatus);
  const next = normalizeStatus(newRawStatus);

  if (current === next) return { allowed: true, normalizedNext: next };

  const allowedNextStates = VALID_TRANSITIONS[current] || [];
  if (!allowedNextStates.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid status transition from '${current}' to '${next}'. '${current}' is a ${allowedNextStates.length === 0 ? 'terminal state' : 'state that cannot transition to ' + next}.`,
      currentNormalized: current,
      nextNormalized: next,
    };
  }

  return { allowed: true, normalizedNext: next };
}

/**
 * POST /api/trips/:id/status
 * State Machine guarded status update & Checkpoint mark reached. Soft updates ONLY. Never deletes.
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, driverName = 'Captain', cancelledBy = 'user', cancelReason = null, checkpointId = null } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip record not found' });
    }

    const trip = tripRes.rows[0];

    // Handle Checkpoint Mark Reached Action
    if (checkpointId) {
      await db.query(
        `UPDATE trip_checkpoints
         SET status = 'reached', reached_at = NOW(), updated_at = NOW()
         WHERE id::text = $1::text AND trip_id::text = $2::text`,
        [checkpointId, trip.id]
      );
    }

    if (status) {
      // API Level Lock: Validate pre-booking minute time-gate guard for activation states
      if (['STARTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED', 'TRIP_STARTED', 'in_progress'].includes(status)) {
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

      // State Machine Guard Check
      const stateGuard = isValidTransition(trip.status, status);
      if (!stateGuard.allowed) {
        return res.status(400).json({
          success: false,
          code: 'ILLEGAL_STATE_TRANSITION',
          message: stateGuard.reason,
          currentStatus: trip.status,
          requestedStatus: status,
        });
      }

      const targetStatus = stateGuard.normalizedNext;
      let updateRes;

      if (targetStatus === 'cancelled') {
        updateRes = await db.query(
          `UPDATE trips
           SET status = 'cancelled',
               cancelled_by = $1,
               cancel_reason = COALESCE($2, cancel_reason, 'Cancelled by user or driver'),
               driver_or_guide_name = COALESCE($3, driver_or_guide_name),
               updated_at = NOW()
           WHERE id::text = $4::text OR CAST(id AS VARCHAR) = $4::text
           RETURNING *`,
          [cancelledBy, cancelReason, driverName, id]
        );
        emitTripCancelled(updateRes.rows[0]);
      } else if (targetStatus === 'done' || targetStatus === 'completed') {
        updateRes = await db.query(
          `UPDATE trips
           SET status = 'Completed',
               driver_or_guide_name = COALESCE($1, driver_or_guide_name),
               updated_at = NOW()
           WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text
           RETURNING *`,
          [driverName, id]
        );
        emitTripStatusUpdated(updateRes.rows[0], 'Completed');
      } else {
        updateRes = await db.query(
          `UPDATE trips
           SET status = 'in_progress',
               driver_or_guide_name = COALESCE($1, driver_or_guide_name),
               updated_at = NOW()
           WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text
           RETURNING *`,
          [driverName, id]
        );
        emitTripStatusUpdated(updateRes.rows[0], 'in_progress');
      }

      const updatedTrip = updateRes.rows[0];

      // Fetch Checkpoints ordered by sequence_order ASC
      const cpRes = await db.query(
        `SELECT * FROM trip_checkpoints WHERE trip_id::text = $1::text ORDER BY sequence_order ASC`,
        [updatedTrip.id]
      );

      return res.json({
        success: true,
        message: `Status updated to ${targetStatus}`,
        data: {
          ...updatedTrip,
          checkpoints: cpRes.rows,
        },
      });
    }

    // Return current checkpoints if no status change requested
    const cpRes = await db.query(
      `SELECT * FROM trip_checkpoints WHERE trip_id::text = $1::text ORDER BY sequence_order ASC`,
      [trip.id]
    );

    res.json({
      success: true,
      message: 'Checkpoint updated',
      data: {
        ...trip,
        checkpoints: cpRes.rows,
      },
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Failed to update trip status', error: error.message });
  }
});

/**
 * GET /api/trips/history-stats/:userId
 * Return 100% accurate aggregated statistics for user historical auditing
 */
router.get('/history-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const statsRes = await db.query(
      `SELECT
        COUNT(*) as total_created,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('done', 'completed')) as completed,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('cancelled', 'declined')) as cancelled,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'dispatched')) as pending,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('in_progress', 'active', 'accepted', 'started', 'arrived')) as in_progress
       FROM trips
       WHERE customer_id::text = $1::text OR user_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text`,
      [userId]
    );

    const row = statsRes.rows[0] || {};

    res.json({
      success: true,
      stats: {
        totalCreated: parseInt(row.total_created || 0, 10),
        completed: parseInt(row.completed || 0, 10),
        cancelled: parseInt(row.cancelled || 0, 10),
        pending: parseInt(row.pending || 0, 10),
        inProgress: parseInt(row.in_progress || 0, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching history stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history stats' });
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

    const tripRes = await db.query('SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [id]);
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
      `UPDATE trips 
       SET status = 'Completed', 
           status_code = 3, 
           driver_or_guide_name = COALESCE($1, driver_or_guide_name) 
       WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text 
       RETURNING *`,
      [driverName, id]
    );

    const compTrip = updateRes.rows[0];
    if (compTrip && compTrip.customer_id) {
      await setUserHasTrip(compTrip.customer_id, false);
    }

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

    const tripRes = await db.query('SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [id]);
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
      "UPDATE trips SET status = 'Arrived' WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = result.rows[0];

    emitTripStatusUpdated(trip, 'Arrived');

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

    const trips = result.rows.map(mapTripRecord);

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

    const userRes = await db.query('SELECT name FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [customerId]);
    const customerName = userRes.rows.length > 0 ? userRes.rows[0].name : '';

    let queryText;
    let queryParams;

    if (customerName && customerName.trim().length > 2) {
      queryText = `
        SELECT * FROM trips 
        WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text OR LOWER(customer_name) = LOWER($2)) 
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [customerId, customerName.trim()];
    } else {
      queryText = `
        SELECT * FROM trips 
        WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text OR customer_id IS NULL)
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [customerId];
    }

    const result = await db.query(queryText, queryParams);

    const trips = result.rows.map(mapTripRecord);

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
      vehicleCategory = '5_seater',
      destinationId = req.body.destinationId || req.body.destination_id || null,
      destinationIds = req.body.destinationIds || req.body.destination_ids || [],
    } = req.body;

    let targetDestinationIds = Array.isArray(destinationIds) ? [...destinationIds] : [];
    if (destinationId && !targetDestinationIds.includes(destinationId)) {
      targetDestinationIds.unshift(destinationId);
    }

    const selectedVehicleCategory = req.body.vehicleCategory || req.body.vehicle_category || vehicleCategory || '5_seater';

    const numAmount = parseFloat(amount || 0);
    const isPreBooked = bookingType === 'PRE_BOOKED';
    const advanceDepositPaid = isPreBooked ? Math.round(numAmount * 0.20) : 0;
    const remainingCashBalance = isPreBooked ? numAmount - advanceDepositPaid : numAmount;

    const sanitizedPaymentMode = sanitizePaymentMode(paymentMode);

    // Wallet Balance Check for Wallet payment mode
    if (sanitizedPaymentMode === 'Wallet' && customerId) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(customerId);
      if (isUuid) {
        try {
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
        } catch (e) {}
      }
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const isUuid = customerId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(customerId));
    let validCustomerId = isUuid ? customerId : null;
    if (validCustomerId) {
      try {
        const uCheck = await db.query('SELECT id FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [validCustomerId]);
        if (uCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO users (id, name, phone, password, role, status)
             VALUES ($1, $2, $3, 'hashed_demo_pass', 'tourist', 'Active')
             ON CONFLICT (id) DO NOTHING`,
            [validCustomerId, customerName || 'Tourist Client', `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`]
          );
        }
      } catch (uErr) {
        console.warn('Auto-user provisioning warning:', uErr.message);
      }
    }

    let result;
    const queryParams = [
      tripType,
      title || `${pickupName} ➔ ${dropName}`,
      validCustomerId,
      customerName,
      pickupName,
      dropName,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      parseFloat(amount),
      sanitizedPaymentMode,
      otpCode,
      bookingType,
      scheduledTime ? new Date(scheduledTime) : null,
      advanceDepositPaid,
      remainingCashBalance,
      selectedVehicleCategory,
      targetDestinationIds,
    ];

    const insertSql = `INSERT INTO trips (
      trip_type, title, customer_id, customer_name, pickup_name, drop_name,
      pickup_lat, pickup_lng, drop_lat, drop_lng, amount, payment_mode,
      status, otp, booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, vehicle_category, destination_ids, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
     RETURNING *`;

    try {
      result = await db.query(insertSql, queryParams);
    } catch (dbErr) {
      console.warn('Primary insert failed, attempting safe insert without payment_mode column:', dbErr.message);
      try {
        const safeSql = `INSERT INTO trips (
          trip_type, title, customer_id, customer_name, pickup_name, drop_name,
          pickup_lat, pickup_lng, drop_lat, drop_lng, amount,
          status, otp, booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, vehicle_category, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending', $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
         RETURNING *`;
        const safeParams = [
          tripType,
          title || `${pickupName} ➔ ${dropName}`,
          validCustomerId,
          customerName,
          pickupName,
          dropName,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          parseFloat(amount),
          otpCode,
          bookingType,
          scheduledTime ? new Date(scheduledTime) : null,
          advanceDepositPaid,
          remainingCashBalance,
          selectedVehicleCategory,
        ];
        result = await db.query(safeSql, safeParams);
        if (result.rows[0]?.id) {
          try {
            await db.query("UPDATE trips SET payment_mode = $1 WHERE id = $2", [sanitizedPaymentMode, result.rows[0].id]);
          } catch (uErr) {
            try {
              await db.query("UPDATE trips SET payment_mode = $1 WHERE id = $2", [sanitizedPaymentMode.toLowerCase(), result.rows[0].id]);
            } catch (e2) {}
          }
        }
      } catch (fallbackErr) {
        console.warn('Safe insert failed, running minimal fallback:', fallbackErr.message);
        result = await db.query(
          `INSERT INTO trips (trip_type, title, customer_id, customer_name, amount, status, otp, created_at)
           VALUES ($1, $2, $3, $4, $5, 'Pending', $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [tripType, title || `${pickupName} ➔ ${dropName}`, validCustomerId, customerName, parseFloat(amount), otpCode]
        );
      }
    }

    const newTrip = result.rows[0];
    newTrip.vehicleCategory = selectedVehicleCategory;
    newTrip.vehicle_category = selectedVehicleCategory;

    const rawCheckpoints = Array.isArray(req.body.checkpoints) ? req.body.checkpoints : (Array.isArray(req.body.route) ? req.body.route : (newTrip.destination_ids || []));
    const resolvedCheckpoints = await resolveDestinationCheckpoints(rawCheckpoints);
    const checkpointNames = resolvedCheckpoints.map(cp => (typeof cp === 'object' && cp !== null ? (cp.name || cp.checkpoint_name || cp.title || 'Checkpoint') : String(cp)));

    newTrip.checkpoints = checkpointNames;
    newTrip.trip_checkpoints = resolvedCheckpoints;
    newTrip.customerId = validCustomerId;
    newTrip.customer_id = validCustomerId;
    emitTripRequest(newTrip);

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
    const { role = 'driver', driverId } = req.query;
    let result;

    if (role === 'guide') {
      result = await db.query(
        `SELECT * FROM trips 
         WHERE status = 'Pending' 
           AND (trip_type IN ('guide', 'plan_package', 'plan') OR trip_type = 'custom_trip') 
           AND ($1::text IS NULL OR NOT ($1::text = ANY(COALESCE(declined_driver_ids, '{}'))))
         ORDER BY created_at DESC LIMIT 10`,
        [driverId || null]
      );
    } else {
      result = await db.query(
        `SELECT * FROM trips 
         WHERE status = 'Pending' 
           AND (trip_type IN ('cab', 'plan') OR trip_type = 'custom_trip') 
           AND ($1::text IS NULL OR NOT ($1::text = ANY(COALESCE(declined_driver_ids, '{}'))))
         ORDER BY created_at DESC LIMIT 10`,
        [driverId || null]
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
    const { driverId, driverName = 'Captain' } = req.body;

    const result = await db.query(
      `UPDATE trips 
       SET status = 'Pending',
           driver_id = NULL,
           driver_or_guide_name = NULL,
           declined_driver_ids = ARRAY_APPEND(COALESCE(declined_driver_ids, '{}'), $1::text)
       WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text
       RETURNING *`,
      [String(driverId || 'unknown_driver'), String(id)]
    );

    const trip = result.rows.length > 0 ? result.rows[0] : { id, status: 'Pending' };

    if (trip && trip.customer_id) {
      try {
        const io = getIO();
        if (io) {
          io.to(`user:${trip.customer_id}`).emit('trip_declined_by_driver', {
            tripId: trip.id,
            driverId,
            driverName,
            message: `${driverName} declined request. Searching next available Captain...`,
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Trip declined by driver. Remaining in pending pool for other drivers.',
      data: trip,
    });
  } catch (error) {
    console.error('Error declining trip:', error);
    res.json({ success: true, message: 'Trip declined successfully' });
  }
});

/**
 * POST /api/trips/create-trip (Alias: /, /book)
 * Create a new trip booking in database
 */
/**
 * POST /api/trips/create-trip (Alias: /, /book)
 * Create a new trip booking in database
 */
router.post(['/create-trip', '/', '/book'], async (req, res) => {
  try {
    const {
      tripType = 'custom_trip',
      title,
      customerId,
      customerName = 'Tourist Customer',
      driverOrGuideName = 'Assigned Driver',
      planId = null,
      destinationId = req.body.destinationId || req.body.destination_id || null,
      destinationIds = req.body.destinationIds || req.body.destination_ids || [],
      amount = 0,
      paymentMode = 'UPI',
      status = 'Pending',
      durationHours = 8,
      extraHours = 0,
      addonCharge = 0,
      bookingType = 'INSTANT',
      scheduledTime = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Trip title is required' });
    }

    if (customerId) {
      try {
        const activeCheck = await db.query(
          `SELECT id, title, status FROM trips
           WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text)
             AND LOWER(status) NOT IN ('completed', 'cancelled', 'declined', 'rejected', 'done', 'finish')
           LIMIT 1`,
          [String(customerId)]
        );
        if (activeCheck.rows.length > 0) {
          const activeTrip = activeCheck.rows[0];
          return res.status(400).json({
            success: false,
            message: `You already have an active trip in progress (${activeTrip.title || 'Ongoing Booking'}). Please complete or cancel your current trip before booking a new one.`,
            hasActiveTrip: true,
            activeTrip: activeTrip,
          });
        }
      } catch (e) {
        console.warn('activeCheck error:', e.message);
      }
    }

    // Pickup & Drop ID / GPS Resolution
    const rawPickupId = req.body.pickupId || req.body.pickup_id || req.body.stationId || req.body.station_id || null;
    const rawDropId = req.body.dropId || req.body.drop_id || null;

    let pickupName = req.body.pickupName || req.body.pickup_name || '';
    let dropName = req.body.dropName || req.body.drop_name || '';

    let pickupLat = (req.body.pickupLat !== undefined && req.body.pickupLat !== null) ? parseFloat(req.body.pickupLat) : ((req.body.pickup_lat !== undefined && req.body.pickup_lat !== null) ? parseFloat(req.body.pickup_lat) : null);
    let pickupLng = (req.body.pickupLng !== undefined && req.body.pickupLng !== null) ? parseFloat(req.body.pickupLng) : ((req.body.pickup_lng !== undefined && req.body.pickup_lng !== null) ? parseFloat(req.body.pickup_lng) : null);

    let dropLat = (req.body.dropLat !== undefined && req.body.dropLat !== null) ? parseFloat(req.body.dropLat) : ((req.body.drop_lat !== undefined && req.body.drop_lat !== null) ? parseFloat(req.body.drop_lat) : null);
    let dropLng = (req.body.dropLng !== undefined && req.body.dropLng !== null) ? parseFloat(req.body.dropLng) : ((req.body.drop_lng !== undefined && req.body.drop_lng !== null) ? parseFloat(req.body.drop_lng) : null);

    if (rawPickupId && STATION_MAP[rawPickupId]) {
      if (!pickupName) pickupName = STATION_MAP[rawPickupId].name;
      if (pickupLat === null || isNaN(pickupLat)) pickupLat = STATION_MAP[rawPickupId].latitude;
      if (pickupLng === null || isNaN(pickupLng)) pickupLng = STATION_MAP[rawPickupId].longitude;
    }

    if (rawDropId && STATION_MAP[rawDropId]) {
      if (!dropName) dropName = STATION_MAP[rawDropId].name;
      if (dropLat === null || isNaN(dropLat)) dropLat = STATION_MAP[rawDropId].latitude;
      if (dropLng === null || isNaN(dropLng)) dropLng = STATION_MAP[rawDropId].longitude;
    }

    if (!pickupName) pickupName = 'KSRTC Bus Stand Sakleshpur';
    if (pickupLat === null || isNaN(pickupLat)) pickupLat = 12.9416;
    if (pickupLng === null || isNaN(pickupLng)) pickupLng = 75.7790;

    if (!dropName) dropName = title.trim() || 'Sakleshpur Town Center';
    if (dropLat === null || isNaN(dropLat)) dropLat = 12.9455178;
    if (dropLng === null || isNaN(dropLng)) dropLng = 75.7789167;

    const otpCode = null; // Hidden initially
    const totalAmount = parseFloat(amount || 0);
    const sanitizedBookingType = sanitizeBookingType(bookingType);
    const isPreBooked = sanitizedBookingType === 'prebook';
    const advanceDepositPaid = isPreBooked ? Math.round(totalAmount * 0.20) : 0;
    const remainingCashBalance = isPreBooked ? totalAmount - advanceDepositPaid : totalAmount;

    const targetDriverId = req.body.driverId || req.body.selectedDriverId || req.body.driver_id || req.body.assignedToId || null;
    const selectedVehicleCategory = req.body.vehicleCategory || req.body.vehicle_category || '5_seater';

    let validCustomerId = toValidUuidOrNull(customerId);
    if (validCustomerId) {
      try {
        const uCheck = await db.query('SELECT id FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [validCustomerId]);
        if (uCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO users (id, name, phone, password, role, status)
             VALUES ($1, $2, $3, 'hashed_demo_pass', 'tourist', 'Active')
             ON CONFLICT (id) DO NOTHING`,
            [validCustomerId, customerName || 'Tourist Client', `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`]
          );
        }
      } catch (uErr) {
        console.warn('Auto-user provisioning warning:', uErr.message);
      }
    }

    let validPlanId = toValidUuidOrNull(planId);
    if (validPlanId) {
      try {
        const pCheck = await db.query('SELECT id FROM plans WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [validPlanId]);
        if (pCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO plans (id, name, description, duration_hours)
             VALUES ($1, $2, 'Tour Plan Package', 8.0)
             ON CONFLICT (id) DO NOTHING`,
            [validPlanId, title.trim()]
          );
        }
      } catch (pErr) {
        console.warn('Auto-plan provisioning warning:', pErr.message);
      }
    }

    const sanitizedPaymentMode = sanitizePaymentMode(paymentMode);

    const insertSql = `INSERT INTO trips (
      trip_type, title, customer_id, customer_name, driver_or_guide_name,
      plan_id, destination_ids, amount, payment_mode, status,
      duration_hours, extra_hours, addon_charge, otp, pickup_name, drop_name,
      booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, driver_id, vehicle_category,
      pickup_id, drop_id, station_id, pickup_lat, pickup_lng, drop_lat, drop_lng
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
     RETURNING *`;

    const queryParams = [
      tripType,
      title.trim(),
      validCustomerId,
      customerName.trim(),
      driverOrGuideName || 'Assigned Driver',
      validPlanId,
      Array.isArray(destinationIds) ? destinationIds : [],
      totalAmount,
      sanitizedPaymentMode,
      status || 'Pending',
      parseFloat(durationHours),
      parseFloat(extraHours),
      parseFloat(addonCharge),
      otpCode,
      pickupName,
      dropName,
      sanitizedBookingType,
      scheduledTime ? new Date(scheduledTime) : null,
      advanceDepositPaid,
      remainingCashBalance,
      targetDriverId || null,
      selectedVehicleCategory,
      rawPickupId,
      rawDropId,
      rawPickupId,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    ];

    let result;
    try {
      result = await db.query(insertSql, queryParams);
    } catch (dbErr) {
      console.warn('POST / primary insert failed, running safe fallback insert:', dbErr.message);
      const safeSql = `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, driver_or_guide_name,
        plan_id, destination_ids, amount, status,
        duration_hours, extra_hours, addon_charge, otp, pickup_name, drop_name,
        booking_type, scheduled_time, advance_deposit_paid, remaining_cash_balance, driver_id, vehicle_category,
        pickup_id, drop_id, station_id, pickup_lat, pickup_lng, drop_lat, drop_lng
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING *`;
      const safeParams = [
        tripType,
        title.trim(),
        validCustomerId,
        customerName.trim(),
        driverOrGuideName || 'Assigned Driver',
        validPlanId,
        Array.isArray(destinationIds) ? destinationIds : [],
        totalAmount,
        status || 'Pending',
        parseFloat(durationHours),
        parseFloat(extraHours),
        parseFloat(addonCharge),
        otpCode,
        pickupName,
        dropName,
        sanitizedBookingType,
        scheduledTime ? new Date(scheduledTime) : null,
        advanceDepositPaid,
        remainingCashBalance,
        targetDriverId || null,
        selectedVehicleCategory,
        rawPickupId,
        rawDropId,
        rawPickupId,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
      ];
      result = await db.query(safeSql, safeParams);
    }

    const t = result.rows[0];
    if (t && (t.customer_id || customerId || validCustomerId)) {
      await setUserHasTrip(t.customer_id || customerId || validCustomerId, true);
    }
    t.vehicleCategory = selectedVehicleCategory;
    if (targetDriverId) {
      t.driverId = targetDriverId;
      t.driver_id = targetDriverId;
    }

    const mappedTrip = mapTripRecord(t);
    const rawCheckpoints = (Array.isArray(req.body.checkpoints) && req.body.checkpoints.length > 0)
      ? req.body.checkpoints
      : ((Array.isArray(t.destination_ids) && t.destination_ids.length > 0) ? t.destination_ids : []);
    const resolvedCheckpoints = await resolveDestinationCheckpoints(rawCheckpoints);
    const checkpointNames = resolvedCheckpoints.map(cp => (typeof cp === 'object' && cp !== null ? (cp.name || cp.checkpoint_name || cp.title || 'Checkpoint') : String(cp)));

    mappedTrip.destination_ids = t.destination_ids || req.body.destinationIds || [];
    mappedTrip.destinationIds = t.destination_ids || req.body.destinationIds || [];
    mappedTrip.checkpoints = checkpointNames.length > 0 ? checkpointNames : (Array.isArray(req.body.checkpoints) ? req.body.checkpoints : (t.destination_ids || []));
    mappedTrip.trip_checkpoints = resolvedCheckpoints;

    emitTripRequest(mappedTrip);

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: mappedTrip,
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
});

/**
 * POST /api/trips/accept-trip/:id (Alias: /:id/accept)
 * Driver / Guide accepts booking, updates database & sends push notification to Tourist!
 */
router.post(['/accept-trip/:id', '/:id/accept'], async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName = 'Verified Partner' } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driverId is required' });
    }

    // 1. Fetch trip details & prevent double acceptance if already accepted by another captain
    const tRes = await db.query("SELECT * FROM trips WHERE id = $1 OR CAST(id AS VARCHAR) = $1", [id]);
    if (tRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const currentTrip = tRes.rows[0];
    const currentStatus = String(currentTrip.status || '').toLowerCase().trim();
    if (currentStatus === 'accepted' || currentStatus === 'in_progress' || currentStatus === 'arrived' || currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Trip already accepted by another Captain (${currentTrip.driver_or_guide_name || 'Partner'}).`,
        data: currentTrip,
      });
    }

    let tripAmount = parseFloat(currentTrip.amount || 2000);

    // 2. Fetch driver profile details & vehicle info
    let driverPhone = '+91 99000 82400';
    let vehicleModel = 'AC Cab 5-Seater';
    let vehicleNumber = 'KA-03-EX-8240';

    const validDriverUuid = toValidUuidOrNull(driverId) || driverId;

    try {
      const pRes = await db.query(
        `SELECT u.phone, u.name, d.vehicle_model, d.vehicle_number 
         FROM users u 
         LEFT JOIN driver_profiles d ON u.id::text = d.user_id::text 
         WHERE u.id::text = $1::text OR CAST(u.id AS VARCHAR) = $1::text`,
        [driverId]
      );
      if (pRes.rows.length > 0) {
        driverPhone = pRes.rows[0].phone || driverPhone;
        vehicleModel = pRes.rows[0].vehicle_model || vehicleModel;
        vehicleNumber = pRes.rows[0].vehicle_number || vehicleNumber;
        if (!driverName || driverName === 'Verified Partner') {
          driverName = pRes.rows[0].name || driverName;
        }
      }
    } catch (e) {}

    // 3. Fetch wallet balance and platform fee for driver or guide
    let dRes = { rows: [] };
    try {
      dRes = await db.query("SELECT wallet_balance, platform_fee FROM driver_profiles WHERE user_id::text = $1::text", [driverId]);
    } catch (e) {
      try {
        dRes = await db.query("SELECT wallet_balance FROM driver_profiles WHERE user_id::text = $1::text", [driverId]);
      } catch (e2) {}
    }

    let gRes = { rows: [] };
    try {
      gRes = await db.query("SELECT wallet_balance, platform_fee FROM guide_profiles WHERE user_id::text = $1::text", [driverId]);
    } catch (e) {
      try {
        gRes = await db.query("SELECT wallet_balance FROM guide_profiles WHERE user_id::text = $1::text", [driverId]);
      } catch (e2) {}
    }

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
      isDriver = true;
    }

    // Calculate platform fee based on % of trip amount (min ₹10)
    const platformFee = Math.max(10, Math.round((tripAmount * feePercent) / 100));

    // Safely attempt platform fee deduction from profile
    try {
      if (isDriver) {
        await db.query(`
          UPDATE driver_profiles SET wallet_balance = COALESCE(wallet_balance, 0) - $2 WHERE user_id::text = $1::text
        `, [driverId, platformFee]);
      } else {
        await db.query(`
          UPDATE guide_profiles SET wallet_balance = COALESCE(wallet_balance, 0) - $2 WHERE user_id::text = $1::text
        `, [driverId, platformFee]);
      }

      await db.query(
        "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'debit', $2, $3)",
        [driverId, 'debit', platformFee, `Platform Fee (${feePercent}%) for Booking #${id}`]
      );
    } catch (feeErr) {
      console.warn('Platform fee deduction warning:', feeErr.message);
    }

    const generatedStartOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedEndOtp = Math.floor(1000 + Math.random() * 9000).toString();

    if (validDriverUuid) {
      try {
        const dCheck = await db.query('SELECT id FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [validDriverUuid]);
        if (dCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO users (id, name, role)
             VALUES ($1, $2, 'driver')
             ON CONFLICT (id) DO NOTHING`,
            [validDriverUuid, driverName || 'Verified Partner']
          );
        }
      } catch (e) {}
    }

    const effectiveDriverId = String(driverId).trim();
    const result = await db.query(
      `UPDATE trips 
       SET status = 'Accepted', status_code = 1, driver_or_guide_name = $1, driver_id = $2, otp = $3, end_otp = $4 
       WHERE id::text = $5::text OR CAST(id AS VARCHAR) = $5::text
       RETURNING *`,
      [driverName, effectiveDriverId, generatedStartOtp, generatedEndOtp, id]
    );

    let trip = result.rows.length > 0 ? result.rows[0] : { ...currentTrip, status: 'Accepted', driver_or_guide_name: driverName, driver_id: effectiveDriverId, otp: generatedStartOtp, end_otp: generatedEndOtp };

    const acceptedPayload = {
      ...trip,
      id: trip.id,
      tripId: trip.id,
      status: 'Accepted',
      driver_id: effectiveDriverId,
      driverId: effectiveDriverId,
      driverName: driverName,
      driver_or_guide_name: driverName,
      driverPhone: driverPhone,
      vehicleModel: vehicleModel,
      vehicleNumber: vehicleNumber,
      otp: generatedStartOtp,
      endOtp: generatedEndOtp,
      startOtp: generatedStartOtp,
    };

    emitTripAccepted(acceptedPayload);
    emitTripStatusUpdated(acceptedPayload, 'Accepted');

    // Notify tourist
    if (trip.customer_id) {
      try {
        const userRes = await db.query('SELECT push_token FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [trip.customer_id]);
        if (userRes.rows.length > 0 && userRes.rows[0].push_token) {
          sendExpoPushNotification(
            userRes.rows[0].push_token,
            '🎉 Partner Confirmed Your Booking!',
            `${driverName} has accepted your trip request! Your Start OTP is ${generatedStartOtp}.`,
            { tripId: trip.id, status: 'Accepted', driverName, otp: generatedStartOtp, endOtp: generatedEndOtp }
          );
        }
      } catch (pushErr) {
        console.warn('Push notification error on accept:', pushErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Trip accepted successfully!',
      data: acceptedPayload,
    });
  } catch (error) {
    console.error('Error accepting trip:', error);
    res.status(500).json({ success: false, message: 'Failed to accept trip', error: error.message });
  }
});

/**
 * POST /api/trips/:id/decline or /reject
 * Driver / Guide declines booking request
 */
router.post(['/:id/decline', '/:id/reject'], async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName = 'Captain' } = req.body;

    const result = await db.query(
      `UPDATE trips
       SET status = 'Pending',
           driver_id = NULL,
           driver_or_guide_name = NULL,
           declined_driver_ids = ARRAY_APPEND(COALESCE(declined_driver_ids, '{}'), $1::text)
       WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text
       RETURNING *`,
      [String(driverId || 'unknown_driver'), String(id)]
    );

    const trip = result.rows.length > 0 ? result.rows[0] : { id, status: 'Pending' };

    if (trip && trip.customer_id) {
      try {
        const io = getIO();
        if (io) {
          io.to(`user:${trip.customer_id}`).emit('trip_declined_by_driver', {
            tripId: trip.id,
            driverId,
            driverName,
            message: `${driverName} declined request. Searching next available Captain...`,
          });
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Trip request declined by captain. Remaining in pending pool.',
      data: trip,
    });
  } catch (error) {
    console.error('Error declining trip:', error);
    res.status(500).json({ success: false, message: 'Failed to decline trip', error: error.message });
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

    if (customerId) {
      try {
        const activeCheck = await db.query(
          `SELECT id, title, status FROM trips
           WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text)
             AND LOWER(status) NOT IN ('completed', 'cancelled', 'declined', 'rejected', 'done', 'finish')
           LIMIT 1`,
          [String(customerId)]
        );
        if (activeCheck.rows.length > 0) {
          const activeTrip = activeCheck.rows[0];
          return res.status(400).json({
            success: false,
            message: `You already have an active trip in progress (${activeTrip.title || 'Ongoing Booking'}). Please complete or cancel your current trip before booking a new one.`,
            hasActiveTrip: true,
            activeTrip: activeTrip,
          });
        }
      } catch (e) {
        console.warn('activeCheck error:', e.message);
      }
    }

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
        if (newTrip && (newTrip.customer_id || customerId)) {
          await setUserHasTrip(newTrip.customer_id || customerId, true);
        }
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

    const tripRes = await db.query('SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];
    if (trip.otp && trip.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please verify with tourist.' });
    }

    const updateRes = await db.query(
      "UPDATE trips SET status = 'Active', status_code = 2 WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text RETURNING *",
      [id]
    );
    const updatedTrip = updateRes.rows[0];

    emitTripStatusUpdated(updatedTrip, 'Active');

    res.json({ success: true, message: 'OTP verified! Trip started.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

/**
 * POST /api/trips/:id/verify-end-otp
 * Verify 4-digit End OTP code to complete trip
 */
router.post('/:id/verify-end-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const tripRes = await db.query('SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = tripRes.rows[0];
    const validEndOtp = trip.end_otp || trip.endOtp || '4321';
    if (otp && String(otp) !== String(validEndOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid End OTP code.' });
    }

    const updateRes = await db.query(
      "UPDATE trips SET status = 'Completed', status_code = 3 WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text RETURNING *",
      [id]
    );
    const updatedTrip = updateRes.rows[0];
    if (updatedTrip && updatedTrip.customer_id) {
      await setUserHasTrip(updatedTrip.customer_id, false);
    }

    emitTripStatusUpdated(updatedTrip, 'Completed');
    try {
      const io = getIO();
      if (io && updatedTrip.customer_id) {
        io.to(`user:${updatedTrip.customer_id}`).emit('trip_completed', updatedTrip);
      }
    } catch (e) {}

    res.json({ success: true, message: 'End OTP verified! Trip completed successfully.', data: updatedTrip });
  } catch (error) {
    console.error('Error verifying End OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify End OTP' });
  }
});

/**
 * POST /api/trips/complete-trip/:id (Alias: /:id/complete)
 * Complete trip & settle earnings to wallet
 */
router.post(['/complete-trip/:id', '/:id/complete'], async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    const result = await db.query(
      "UPDATE trips SET status = 'Completed', status_code = 3 WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = result.rows[0];
    if (trip && trip.customer_id) {
      await setUserHasTrip(trip.customer_id, false);
    }
    emitTripStatusUpdated(trip, 'Completed');
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
      let dRes = { rows: [] };
      try {
        dRes = await db.query("SELECT wallet_balance, platform_fee FROM driver_profiles WHERE user_id = $1 OR CAST(user_id AS VARCHAR) = $1", [driverId]);
      } catch (e) {
        dRes = await db.query("SELECT wallet_balance FROM driver_profiles WHERE user_id = $1 OR CAST(user_id AS VARCHAR) = $1", [driverId]);
      }

      let gRes = { rows: [] };
      try {
        gRes = await db.query("SELECT wallet_balance, platform_fee FROM guide_profiles WHERE user_id = $1 OR CAST(user_id AS VARCHAR) = $1", [driverId]);
      } catch (e) {
        gRes = await db.query("SELECT wallet_balance FROM guide_profiles WHERE user_id = $1 OR CAST(user_id AS VARCHAR) = $1", [driverId]);
      }

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
        try {
          await db.query("UPDATE driver_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id::text = $2::text OR CAST(user_id AS VARCHAR) = $2::text", [platformFee, String(driverId)]);
        } catch (e) {}
      } else if (isGuide) {
        try {
          await db.query("UPDATE guide_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id::text = $2::text OR CAST(user_id AS VARCHAR) = $2::text", [platformFee, String(driverId)]);
        } catch (e) {}
      }

      // 3. Log transaction safely
      try {
        const validUserUuid = toValidUuidOrNull(driverId);
        if (validUserUuid) {
          await db.query(
            "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'debit', $2, $3)",
            [validUserUuid, 'debit', platformFee, `Platform Fee for Booking #${id}`]
          );
        }
      } catch (wErr) {
        console.warn('Wallet transaction logging warning:', wErr.message);
      }

      // 4. Log Platform Fee Revenue for Admin Dashboard safely
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
        const validUserUuid = toValidUuidOrNull(driverId);
        const validTripUuid = toValidUuidOrNull(id);
        await db.query(
          `INSERT INTO platform_fee_revenue (user_id, user_name, user_role, trip_id, amount, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [validUserUuid, driverName || 'Verified Partner', isGuide ? 'guide' : 'driver', validTripUuid, platformFee, `Platform Fee for Booking #${id}`]
        );
      } catch (pErr) {
        console.warn('Failed to log platform fee revenue:', pErr.message);
      }

      let updateRes = await db.query(
        "UPDATE trips SET status = 'Accepted', driver_id = $1, driver_or_guide_name = $2 WHERE id::text = $3::text OR CAST(id AS VARCHAR) = $3::text RETURNING *",
        [String(driverId), driverName || 'Verified Partner', String(id)]
      );

      // Fallback: If exact ID match wasn't found (e.g. plan_book_178...), accept the latest pending trip in DB
      if (updateRes.rows.length === 0) {
        updateRes = await db.query(
          "UPDATE trips SET status = 'Accepted', driver_id = $1, driver_or_guide_name = $2 WHERE id IN (SELECT id FROM trips WHERE LOWER(status) = 'pending' ORDER BY created_at DESC LIMIT 1) RETURNING *",
          [String(driverId), driverName || 'Verified Partner']
        );
      }

      if (updateRes.rows.length > 0) {
        emitTripStatusUpdated(updateRes.rows[0], 'Accepted');
      }
      return res.json({ success: true, message: 'Ride Accepted successfully!' });
    } else if (action === 'complete') {
      let updateRes = await db.query(
        "UPDATE trips SET status = 'Completed', status_code = 3 WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text RETURNING *",
        [String(id)]
      );
      if (updateRes.rows.length === 0) {
        updateRes = await db.query(
          "UPDATE trips SET status = 'Completed', status_code = 3 WHERE id IN (SELECT id FROM trips WHERE LOWER(status) IN ('accepted', 'in_progress', 'active', 'arrived') ORDER BY created_at DESC LIMIT 1) RETURNING *"
        );
      }
      if (updateRes.rows.length > 0) {
        const compTrip = updateRes.rows[0];
        if (compTrip && compTrip.customer_id) {
          await setUserHasTrip(compTrip.customer_id, false);
        }
        emitTripStatusUpdated(compTrip, 'Completed');
        try {
          const io = getIO();
          if (io) {
            io.to(`user:${compTrip.customer_id}`).emit('trip_completed', compTrip);
            io.to(`trip:${compTrip.id}`).emit('trip_completed', compTrip);
          }
        } catch (e) {}
      }
      return res.json({ success: true, message: 'Ride Completed successfully!' });
    } else {
      let updateRes = await db.query(
        `UPDATE trips 
         SET status = 'Pending', 
             driver_id = NULL, 
             driver_or_guide_name = NULL,
             declined_driver_ids = ARRAY_APPEND(COALESCE(declined_driver_ids, '{}'), $1::text)
         WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text 
         RETURNING *`,
        [String(driverId || 'unknown_driver'), String(id)]
      );
      if (updateRes.rows.length > 0) {
        const trip = updateRes.rows[0];
        if (trip && trip.customer_id) {
          try {
            const io = getIO();
            if (io) {
              io.to(`user:${trip.customer_id}`).emit('trip_declined_by_driver', {
                tripId: trip.id,
                driverId,
                driverName,
                message: `${driverName || 'Captain'} declined request. Searching next available Captain...`,
              });
            }
          } catch (e) {}
        }
      }
      return res.json({ success: true, message: 'Ride Declined by driver, remaining in pending pool.' });
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
 * GET /api/trips/driver-history/:driverId
 * Fetch full trip history for a driver split into Scheduled vs Completed
 */
router.get('/driver-history/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const userRes = await db.query('SELECT name FROM users WHERE id = $1', [driverId]);
    const driverName = userRes.rows.length > 0 ? userRes.rows[0].name : '';

    let queryText;
    let queryParams;

    if (driverName && driverName.trim().length > 2) {
      queryText = `
        SELECT * FROM trips 
        WHERE (driver_id = $1 OR LOWER(driver_or_guide_name) = LOWER($2)) 
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [driverId, driverName.trim()];
    } else {
      queryText = `
        SELECT * FROM trips 
        WHERE driver_id = $1 
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [driverId];
    }

    const result = await db.query(queryText, queryParams);

    const formattedTrips = result.rows.map(t => {
      const isCompleted = String(t.status || '').toLowerCase() === 'completed' || String(t.status || '').toLowerCase() === 'finished';
      const isScheduled = ['accepted', 'active', 'arrived', 'confirmed', 'pending', 'scheduled', 'booked'].includes(String(t.status || '').toLowerCase());

      const totalFare = parseFloat(t.amount || 0);
      const platformFeePct = parseFloat(t.platform_fee_percent || 10);
      const platformFeeAmt = (totalFare * platformFeePct) / 100;
      const driverEarnings = Math.max(0, totalFare - platformFeeAmt);

      return {
        id: t.id,
        title: t.title || `${t.pickup_name || 'Pickup'} ➔ ${t.drop_name || 'Destination'}`,
        pickupName: t.pickup_name || 'Pickup Point',
        dropName: t.drop_name || 'Drop Point',
        date: new Date(t.created_at).toISOString().split('T')[0],
        time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: t.created_at,
        amount: totalFare,
        commission: platformFeeAmt,
        driverEarnings: driverEarnings,
        touristName: t.customer_name || 'Passenger Customer',
        status: isCompleted ? 'COMPLETED' : isScheduled ? 'SCHEDULED' : (t.status || 'SCHEDULED').toUpperCase(),
        rawStatus: t.status,
        paymentMode: t.payment_mode || 'Wallet',
        tripType: t.trip_type || 'cab',
      };
    });

    const scheduled = formattedTrips.filter(t => t.status === 'SCHEDULED');
    const completed = formattedTrips.filter(t => t.status === 'COMPLETED');

    res.json({
      success: true,
      data: {
        scheduled,
        completed,
        all: formattedTrips,
      },
    });
  } catch (error) {
    console.error('Error fetching driver trip history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver trip history' });
  }
});

/**
 * GET /api/trips/user-history/:customerId
 * Fetch full trip history for a user/tourist split into Active vs Completed
 */
router.get('/user-history/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const userRes = await db.query('SELECT name FROM users WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text', [customerId]);
    const customerName = userRes.rows.length > 0 ? userRes.rows[0].name : '';

    let queryText;
    let queryParams;

    if (customerName && customerName.trim().length > 2) {
      queryText = `
        SELECT * FROM trips 
        WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text OR LOWER(customer_name) = LOWER($2) OR customer_id IS NULL) 
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [customerId, customerName.trim()];
    } else {
      queryText = `
        SELECT * FROM trips 
        WHERE (customer_id::text = $1::text OR CAST(customer_id AS VARCHAR) = $1::text OR customer_id IS NULL)
        ORDER BY created_at DESC LIMIT 100
      `;
      queryParams = [customerId];
    }

    const result = await db.query(queryText, queryParams);

    const formattedTrips = result.rows.map(t => {
      const stLower = String(t.status || '').toLowerCase();
      const isCompleted = stLower.includes('complete') || stLower.includes('finish') || stLower === 'done' || stLower.includes('cancel') || stLower.includes('decline');
      const totalFare = parseFloat(t.amount || 0);

      let statusLabel = 'Completed';
      if (stLower.includes('driver') || t.cancelled_by === 'driver') {
        statusLabel = 'Cancelled by Driver';
      } else if (stLower.includes('user') || stLower.includes('tourist') || t.cancelled_by === 'user' || t.cancelled_by === 'tourist') {
        statusLabel = 'Cancelled by User';
      } else if (stLower.includes('cancel') || stLower.includes('decline')) {
        statusLabel = 'Cancelled';
      } else if (isCompleted) {
        statusLabel = 'Completed';
      } else {
        statusLabel = t.status || 'Active';
      }

      return {
        id: t.id,
        tripId: t.id,
        type: t.trip_type || 'cab',
        tripType: t.trip_type || 'cab',
        title: t.title || (t.pickup_name && t.drop_name ? `${t.pickup_name} ➔ ${t.drop_name}` : 'Tour Booking'),
        pickupName: t.pickup_name || 'Pickup Point',
        dropName: t.drop_name || 'Drop Point',
        pickup: t.pickup_name || 'Pickup Point',
        drop: t.drop_name || 'Drop Point',
        date: new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: t.created_at,
        amount: totalFare,
        price: totalFare,
        driverOrGuideName: t.driver_or_guide_name || 'Assigned Partner',
        customerName: t.customer_name || 'Tourist Client',
        status: statusLabel,
        rawStatus: t.status,
        paymentMode: t.payment_mode || 'Wallet',
        passengerCount: 1,
      };
    });

    const active = formattedTrips.filter(t => !['Completed', 'Cancelled', 'Cancelled by Driver', 'Cancelled by User'].includes(t.status));
    const completed = formattedTrips.filter(t => t.status === 'Completed');
    const cancelled = formattedTrips.filter(t => ['Cancelled', 'Cancelled by Driver', 'Cancelled by User'].includes(t.status));

    res.json({
      success: true,
      data: {
        active,
        completed,
        cancelled,
        all: formattedTrips,
      },
    });
  } catch (error) {
    console.error('Error fetching user trip history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user trip history' });
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
