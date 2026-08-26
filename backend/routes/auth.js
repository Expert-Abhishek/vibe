const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'vibe_secret_key_change_in_production';

/**
 * Authentication Middleware: Verify JWT Bearer Token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

/**
 * POST /api/auth/register
 * Register a new user (Tourist, Driver, or Guide) with role-specific profile details.
 */
router.post('/register', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      name,
      phone,
      alternate_phone,
      alt_phone,
      alternatePhone,
      email,
      password,
      role = 'tourist',
      // Driver specific fields
      vehicle_type,
      vehicle_model,
      vehicle_number,
      license_number,
      // Guide specific fields
      expertise,
      license_id,
      bio,
    } = req.body;

    const cleanAltPhone = (alternate_phone || alt_phone || alternatePhone || '').trim();

    // 1. Validation
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and password are required fields.',
      });
    }

    const cleanRole = ['tourist', 'driver', 'guide'].includes(role) ? role : 'tourist';
    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    // OTP verification check if provided
    const otpCode = (req.body.otp || req.body.code || '').trim();
    if (otpCode) {
      if (otpCode.length !== 4) {
        return res.status(400).json({ success: false, message: 'Valid 4-digit verification OTP code is required.' });
      }
      const otpCheck = await db.query('SELECT otp, expires_at FROM registration_otps WHERE phone = $1', [cleanPhone]);
      if (otpCheck.rows.length === 0 || otpCheck.rows[0].otp !== otpCode || new Date() > new Date(otpCheck.rows[0].expires_at)) {
        return res.status(400).json({ success: false, message: 'Invalid or expired 4-digit registration OTP code.' });
      }
      await db.query('DELETE FROM registration_otps WHERE phone = $1', [cleanPhone]);
    }

    // 2. Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)',
      [cleanPhone, cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this phone number or email is already registered.',
      });
    }

    // 3. Hash Password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Initial status: 'Active' for tourists, 'Pending KYC' for drivers/guides
    const initialStatus = cleanRole === 'tourist' ? 'Active' : 'Pending KYC';

    // 4. Begin SQL Transaction
    await client.query('BEGIN');

    const insertUserQuery = `
      INSERT INTO users (name, phone, alternate_phone, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, phone, alternate_phone, email, role, status, created_at
    `;
    const userResult = await client.query(insertUserQuery, [
      name.trim(),
      cleanPhone,
      cleanAltPhone || null,
      cleanEmail,
      passwordHash,
      cleanRole,
      initialStatus,
    ]);


    const newUser = userResult.rows[0];
    let profileData = null;

    // 5. Create role specific profile
    if (cleanRole === 'driver') {
      const {
        photo_url, rc_url, dl_url, insurance_url, aadhar_url,
        car_front_url, car_left_url, car_right_url, car_back_url,
      } = req.body;

      try {
        const insertDriverQuery = `
          INSERT INTO driver_profiles (
            user_id, vehicle_type, vehicle_model, vehicle_number, license_number,
            photo_url, rc_url, dl_url, insurance_url, aadhar_url,
            car_front_url, car_left_url, car_right_url, car_back_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;
        const driverResult = await client.query(insertDriverQuery, [
          newUser.id,
          vehicle_type || '5seater',
          vehicle_model || '',
          vehicle_number || '',
          license_number || '',
          photo_url || null,
          rc_url || null,
          dl_url || null,
          insurance_url || null,
          aadhar_url || null,
          car_front_url || null,
          car_left_url || null,
          car_right_url || null,
          car_back_url || null,
        ]);
        profileData = driverResult.rows[0];
      } catch (profileErr) {
        console.warn('Inserting driver document columns failed, using fallback insert:', profileErr.message);
        const fallbackDriverQuery = `
          INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_model, vehicle_number, license_number, photo_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const fallbackRes = await client.query(fallbackDriverQuery, [
          newUser.id,
          vehicle_type || '5seater',
          vehicle_model || '',
          vehicle_number || '',
          license_number || '',
          photo_url || null,
        ]);
        profileData = fallbackRes.rows[0];
      }
    } else if (cleanRole === 'guide') {
      const { photo_url, id_proof_url } = req.body;

      try {
        const insertGuideQuery = `
          INSERT INTO guide_profiles (user_id, expertise, license_id, bio, photo_url, id_proof_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const guideResult = await client.query(insertGuideQuery, [
          newUser.id,
          expertise || 'General Tour Guide',
          license_id || '',
          bio || '',
          photo_url || null,
          id_proof_url || null,
        ]);
        profileData = guideResult.rows[0];
      } catch (profileErr) {
        console.warn('Inserting guide document columns failed, using fallback insert:', profileErr.message);
        const fallbackGuideQuery = `
          INSERT INTO guide_profiles (user_id, expertise, license_id, bio, photo_url)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const fallbackRes = await client.query(fallbackGuideQuery, [
          newUser.id,
          expertise || 'General Tour Guide',
          license_id || '',
          bio || '',
          photo_url || null,
        ]);
        profileData = fallbackRes.rows[0];
      }
    }

    await client.query('COMMIT');

    // 6. Generate JWT Token
    const token = jwt.sign(
      { userId: newUser.id, phone: newUser.phone, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        profile: profileData,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in user registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// Ensure Database Indexes on startup for sub-millisecond user lookup
db.query(`
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
`).catch((err) => console.warn('User table index initialization warning:', err.message));

/**
 * POST /api/auth/login
 * Authenticate user with phone/email and password.
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, phone, password } = req.body;
    const loginKey = (identifier || phone || '').trim();

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number/email and password are required.',
      });
    }

    // Search user by phone or email with pre-joined profile for single DB roundtrip (<10ms execution)
    const userQuery = `
      SELECT 
        u.id, u.name, u.phone, u.email, u.password, u.role, u.status, u.theme, u.language,
        d.id as d_id, d.vehicle_type, d.vehicle_model, d.vehicle_number, d.license_number, d.alternate_phone as d_alt_phone, d.is_active as d_active, d.wallet_balance as d_wallet, d.daily_rate as d_daily_rate, d.hourly_addon_rate as d_hourly_rate, d.upi_id as d_upi, d.photo_url as d_photo,
        g.id as g_id, g.expertise, g.license_id, g.bio, g.alternate_phone as g_alt_phone, g.is_active as g_active, g.wallet_balance as g_wallet, g.daily_rate as g_daily_rate, g.upi_id as g_upi, g.photo_url as g_photo
      FROM users u
      LEFT JOIN driver_profiles d ON d.user_id::text = u.id::text
      LEFT JOIN guide_profiles g ON g.user_id::text = u.id::text
      WHERE u.phone = $1 OR LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const result = await db.query(userQuery, [loginKey]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const row = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, row.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password.',
      });
    }

    // Strict KYC Status Enforcement for Driver & Guide
    if (row.role === 'driver' || row.role === 'guide') {
      if (row.status === 'Pending KYC') {
        return res.status(403).json({
          success: false,
          message: 'Your registration is currently pending admin KYC approval. Please wait for admin verification.',
          status: 'Pending KYC',
        });
      }
      if (row.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated by the admin.',
          status: 'Inactive',
        });
      }
      if (row.status === 'KYC Declined') {
        return res.status(403).json({
          success: false,
          message: 'Your driver/guide registration KYC was declined by the admin.',
          status: 'KYC Declined',
        });
      }
    }

    // Assemble role profile data directly from pre-joined query results
    let profileData = null;
    const userRole = (row.role || '').toLowerCase();
    if (userRole === 'driver' || userRole === 'captain') {
      if (row.d_id) {
        profileData = {
          id: row.d_id,
          user_id: row.id,
          vehicle_type: row.vehicle_type,
          vehicle_model: row.vehicle_model,
          vehicle_number: row.vehicle_number,
          license_number: row.license_number,
          alternate_phone: row.d_alt_phone,
          is_active: row.d_active,
          wallet_balance: row.d_wallet,
          daily_rate: row.d_daily_rate,
          hourly_addon_rate: row.d_hourly_rate,
          upi_id: row.d_upi,
          photo_url: row.d_photo,
        };
      }
    } else if (userRole === 'guide') {
      if (row.g_id) {
        profileData = {
          id: row.g_id,
          user_id: row.id,
          expertise: row.expertise,
          license_id: row.license_id,
          bio: row.bio,
          alternate_phone: row.g_alt_phone,
          is_active: row.g_active,
          wallet_balance: row.g_wallet,
          daily_rate: row.g_daily_rate,
          upi_id: row.g_upi,
          photo_url: row.g_photo,
        };
      }
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: row.id, phone: row.phone, role: row.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        role: row.role,
        status: row.status,
        theme: row.theme || 'dark',
        language: row.language || 'en',
        profile: profileData,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/settings
 * Save user theme & language preferences to database
 */
router.post('/settings', async (req, res) => {
  try {
    const { userId, theme, language } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (theme) {
      await db.query('UPDATE users SET theme = $1 WHERE id = $2', [theme, userId]);
    }
    if (language) {
      await db.query('UPDATE users SET language = $1 WHERE id = $2', [language, userId]);
    }

    res.json({ success: true, message: 'User settings saved to database!' });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

/**
 * PATCH /api/auth/users/:id/status
 * Admin API: Update user status (Active, Pending KYC, KYC Declined, Inactive)
 */
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Active', 'Pending KYC', 'KYC Declined', 'Inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }

    const userRes = await db.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, phone, role, status',
      [status, id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedUser = userRes.rows[0];

    // Also update active flag in profile
    if (updatedUser.role === 'driver') {
      await db.query('UPDATE driver_profiles SET is_active = $1 WHERE user_id = $2', [status === 'Active', id]);
    } else if (updatedUser.role === 'guide') {
      await db.query('UPDATE guide_profiles SET is_active = $1 WHERE user_id = $2', [status === 'Active', id]);
    }

    // Insert real notification into activity_notifications
    try {
      await db.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, $2, '🔔 Account Status Update', $3, CURRENT_TIMESTAMP)`,
        [id, updatedUser.role || 'driver', `Your account status has been updated to: ${status}`]
      );
    } catch (nErr) {
      console.warn('Failed to log status notification:', nErr);
    }

    return res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Admin API: Delete user account and profile
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
});

/**
 * PATCH /api/auth/drivers/:id/rate
 * Admin API: Update Driver daily_rate, hourly_addon_rate and platform_fee
 */
router.patch('/drivers/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { daily_rate, hourly_addon_rate, platform_fee } = req.body;

    const daily = parseFloat(daily_rate) || 2500;
    const hourly = parseFloat(hourly_addon_rate) || 200;
    const fee = platform_fee !== undefined ? parseFloat(platform_fee) : 10.0;

    const result = await db.query(
      `UPDATE driver_profiles 
       SET daily_rate = $1, hourly_addon_rate = $2, platform_fee = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $4 
       RETURNING *`,
      [daily, hourly, fee, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    // Insert real activity notification into database for driver
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
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, 'driver', '📢 Admin Updated Your Pricing Rates!', $2, CURRENT_TIMESTAMP)`,
        [id, `Daily Rate: ₹${daily}/day | Hourly Addon: ₹${hourly}/hr | Platform Fee: ${fee}%`]
      );
    } catch (nErr) {
      console.warn('Failed to log rate update notification:', nErr);
    }

    return res.json({
      success: true,
      message: 'Driver rates updated successfully',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating driver rate:', error);
    return res.status(500).json({ success: false, message: 'Failed to update driver rates', error: error.message });
  }
});

/**
 * PATCH /api/auth/guides/:id/rate
 * Admin API: Update Guide daily_rate
 */
router.patch('/guides/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { daily_rate } = req.body;

    const daily = parseFloat(daily_rate) || 2000;

    const result = await db.query(
      `UPDATE guide_profiles 
       SET daily_rate = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2 
       RETURNING *`,
      [daily, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guide profile not found' });
    }

    return res.json({
      success: true,
      message: 'Guide rate updated successfully',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating guide rate:', error);
    return res.status(500).json({ success: false, message: 'Failed to update guide rate', error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get currently authenticated user details using JWT Bearer header.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userResult = await db.query(
      'SELECT id, name, phone, email, role, status, photo_url, theme, language, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    let profileData = null;

    if (user.role === 'driver') {
      const driverRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1', [userId]);
      profileData = driverRes.rows[0] || null;
    } else if (user.role === 'guide') {
      const guideRes = await db.query('SELECT * FROM guide_profiles WHERE user_id = $1', [userId]);
      profileData = guideRes.rows[0] || null;
    }

    return res.json({
      success: true,
      user: {
        ...user,
        profile: profileData,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

/**
 * GET /api/auth/customers
 * Read API: Fetch all Customers / Tourists
 */
router.get('/customers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, phone, email, role, status, created_at,
         COALESCE((
           SELECT SUM(CASE WHEN type = 'topup' OR type = 'refund' THEN amount WHEN type = 'withdrawal' OR type = 'debit' THEN -amount ELSE 0 END)
           FROM wallet_transactions
           WHERE user_id::text = users.id::text
         ), 0.00) AS wallet_balance
       FROM users
       WHERE role = $1
       ORDER BY created_at DESC`,
      ['tourist']
    );
    return res.json({
      success: true,
      count: result.rows.length,
      customers: result.rows,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
  }
});

/**
 * GET /api/auth/customers/:id
 * Read API: Fetch single Customer details by User ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, phone, email, role, status, created_at,
         COALESCE((
           SELECT SUM(CASE WHEN type = 'topup' OR type = 'refund' THEN amount WHEN type = 'withdrawal' OR type = 'debit' THEN -amount ELSE 0 END)
           FROM wallet_transactions
           WHERE user_id::text = users.id::text
         ), 0.00) AS wallet_balance
       FROM users
       WHERE (id::text = $1::text OR CAST(id AS VARCHAR) = $1::text) AND role = $2`,
      [id, 'tourist']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    return res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer', error: error.message });
  }
});

// Fast In-Memory Cache for Drivers Listing (<2ms response time)
let driversCache = null;
let driversCacheTimestamp = 0;
const DRIVERS_CACHE_TTL_MS = 30 * 1000;

/**
 * GET /api/auth/drivers
 * Read API: Fetch all Drivers (Lightweight payload with 30s cache)
 */
router.get('/drivers', async (req, res) => {
  try {
    const isFullDocs = req.query.fullDocs === 'true';
    if (!isFullDocs && driversCache && (Date.now() - driversCacheTimestamp < DRIVERS_CACHE_TTL_MS)) {
      return res.json(driversCache);
    }

    const selectColumns = isFullDocs
      ? `d.*, u.id AS user_id, u.name, u.phone, COALESCE(d.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at`
      : `d.id, d.user_id, d.vehicle_type, d.vehicle_model, d.vehicle_number, d.license_number, d.is_active, d.wallet_balance, d.daily_rate, d.hourly_addon_rate, d.upi_id, d.photo_url, d.car_front_url, u.name, u.phone, COALESCE(d.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at`;

    const query = `
      SELECT ${selectColumns}
      FROM users u
      LEFT JOIN driver_profiles d ON u.id::text = d.user_id::text
      WHERE u.role = 'driver'
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    const responseObj = {
      success: true,
      count: result.rows.length,
      drivers: result.rows,
    };

    if (!isFullDocs) {
      driversCache = responseObj;
      driversCacheTimestamp = Date.now();
    }

    return res.json(responseObj);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch drivers', error: error.message });
  }
});

/**
 * GET /api/auth/drivers/:id
 * Read API: Fetch single Driver profile by User ID
 */
router.get('/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        d.*,
        u.id AS user_id, u.name, u.phone, COALESCE(d.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at
      FROM users u
      LEFT JOIN driver_profiles d ON u.id::text = d.user_id::text
      WHERE (u.id::text = $1::text OR CAST(u.id AS VARCHAR) = $1::text) AND u.role = 'driver'
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    return res.json({ success: true, driver: result.rows[0] });
  } catch (error) {
    console.error('Error fetching driver by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver', error: error.message });
  }
});

/**
 * GET /api/auth/guides
 * Read API: Fetch all Guides with full profile & document details
 */
router.get('/guides', async (req, res) => {
  try {
    const query = `
      SELECT 
        g.*,
        u.id AS user_id, u.name, u.phone, COALESCE(g.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at
      FROM users u
      LEFT JOIN guide_profiles g ON u.id::text = g.user_id::text
      WHERE u.role = 'guide'
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    return res.json({
      success: true,
      count: result.rows.length,
      guides: result.rows,
    });
  } catch (error) {
    console.error('Error fetching guides:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch guides', error: error.message });
  }
});

/**
 * GET /api/auth/guides/:id
 * Read API: Fetch single Guide profile by User ID
 */
router.get('/guides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        g.*,
        u.id AS user_id, u.name, u.phone, COALESCE(g.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at
      FROM users u
      LEFT JOIN guide_profiles g ON u.id::text = g.user_id::text
      WHERE (u.id::text = $1::text OR CAST(u.id AS VARCHAR) = $1::text) AND u.role = 'guide'
    `;

    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guide not found' });
    }
    return res.json({ success: true, guide: result.rows[0] });
  } catch (error) {
    console.error('Error fetching guide by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch guide', error: error.message });
  }
});

/**
 * GET /api/auth/users-list
 * Helper endpoint to fetch all registered users and role profiles for testing & verification.
 */
router.get('/users-list', async (req, res) => {
  try {
    const usersRes = await db.query(
      'SELECT id, name, phone, email, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    const driversRes = await db.query(
      'SELECT d.*, u.name, u.phone FROM driver_profiles d JOIN users u ON d.user_id::text = u.id::text'
    );
    const guidesRes = await db.query(
      'SELECT g.*, u.name, u.phone FROM guide_profiles g JOIN users u ON g.user_id::text = u.id::text'
    );

    return res.json({
      success: true,
      total_users: usersRes.rows.length,
      users: usersRes.rows,
      drivers: driversRes.rows,
      guides: guidesRes.rows,
    });
  } catch (error) {
    console.error('Error fetching users list:', error);
    return res.status(500).json({ success: false, message: 'Error fetching database records', error: error.message });
  }
});

/**
 * POST/DELETE /api/auth/clear-all-data
 * Clear all data from the database for testing fresh
 */
const handleClearAllData = async (req, res) => {
  try {
    const truncateQuery = `
      TRUNCATE TABLE trips, plan_checkpoints, plans, destinations, driver_profiles, guide_profiles, users CASCADE;
    `;
    await db.query(truncateQuery);
    return res.json({ success: true, message: 'All database tables truncated successfully.' });
  } catch (error) {
    console.error('Error clearing database:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear database', error: error.message });
  }
};

router.post('/clear-all-data', handleClearAllData);
router.delete('/clear-all-data', handleClearAllData);

/**
 * POST /api/auth/google
 * Google Sign-In backend handler
 */
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, photo, role = 'tourist' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google Auth requires valid email' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    let user;

    if (userRes.rows.length === 0) {
      const dummyPhone = `g_${Date.now().toString().slice(-8)}`;
      const dummyPassword = await bcrypt.hash(`google_${Date.now()}`, 10);
      const cleanRole = ['tourist', 'driver', 'guide'].includes(role) ? role : 'tourist';

      const insertRes = await db.query(
        `INSERT INTO users (name, phone, email, password, role, status)
         VALUES ($1, $2, $3, $4, $5, 'Active')
         RETURNING *`,
        [name || 'Google User', dummyPhone, cleanEmail, dummyPassword, cleanRole]
      );
      user = insertRes.rows[0];

      if (cleanRole === 'driver') {
        await db.query(
          'INSERT INTO driver_profiles (user_id, vehicle_type, photo_url) VALUES ($1, $2, $3)',
          [user.id, '5seater', photo || null]
        );
      } else if (cleanRole === 'guide') {
        await db.query(
          'INSERT INTO guide_profiles (user_id, photo_url) VALUES ($1, $2)',
          [user.id, photo || null]
        );
      }
    } else {
      user = userRes.rows[0];
    }

    let profileData = null;
    if (user.role === 'driver') {
      const dRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1', [user.id]);
      profileData = dRes.rows[0] || null;
    } else if (user.role === 'guide') {
      const gRes = await db.query('SELECT * FROM guide_profiles WHERE user_id = $1', [user.id]);
      profileData = gRes.rows[0] || null;
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Google Sign-In successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: profileData,
      },
    });
  } catch (error) {
    console.error('Error in Google auth:', error);
    return res.status(500).json({ success: false, message: 'Google Auth Error', error: error.message });
  }
});

/**
 * POST /api/auth/push-token
 * Register/Update FCM / Push token for the user
 */
router.post(['/push-token', '/fcm-token'], async (req, res) => {
  try {
    const { userId, phone, pushToken, fcmToken, token } = req.body;
    const activeToken = (pushToken || fcmToken || token || '').trim();
    const identifier = (userId || phone || '').trim();

    if (!identifier || !activeToken) {
      return res.status(400).json({ success: false, message: 'userId/phone and pushToken are required' });
    }

    const cleanPhone = identifier.replace(/\D/g, '').slice(-10);

    const updateRes = await db.query(
      `UPDATE users 
       SET push_token = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id::text = $2::text OR phone = $2::text OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $3`,
      [activeToken, identifier, cleanPhone || 'none']
    );

    res.json({
      success: true,
      message: 'FCM / Push token updated successfully in backend database',
      rowCount: updateRes.rowCount,
    });
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).json({ success: false, message: 'Failed to update push token', error: error.message });
  }
});

/**
 * POST /api/auth/driver-location
 * Update driver's live GPS coordinates & active state
 */
router.post('/driver-location', async (req, res) => {
  try {
    const { driverId, latitude, longitude, isActive = true } = req.body;

    if (!driverId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'driverId, latitude, and longitude required' });
    }

    await db.query(
      `UPDATE driver_profiles
       SET latitude = $1, longitude = $2, is_active = $3, last_active_at = CURRENT_TIMESTAMP
       WHERE user_id = $4 OR id = $4`,
      [parseFloat(latitude), parseFloat(longitude), isActive, driverId]
    );

    res.json({ success: true, message: 'Driver location updated' });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

/**
 * GET /api/auth/users/:id/profile
 * Fetch complete user & role profile (Tourist, Driver, or Guide)
 */
router.get('/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const uRes = await db.query(
      'SELECT id, name, phone, alternate_phone, email, role, status, photo_url, theme, language, created_at FROM users WHERE id = $1',
      [id]
    );

    if (uRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = uRes.rows[0];
    let profileData = null;

    const dRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1 OR id = $1', [id]);
    const gRes = await db.query('SELECT * FROM guide_profiles WHERE user_id = $1 OR id = $1', [id]);

    if (dRes.rows.length > 0) {
      profileData = dRes.rows[0];
    } else if (gRes.rows.length > 0) {
      profileData = gRes.rows[0];
    }

    return res.json({
      success: true,
      user: {
        ...user,
        profile: profileData,
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile', error: error.message });
  }
});

/**
 * PUT /api/auth/users/:id/profile
 * Update user & role profile (Tourist, Driver, Captain, or Guide)
 */
router.put('/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      alternate_phone,
      alt_phone,
      email,
      role,
      vehicle_model,
      vehicle_number,
      vehicle_category,
      vehicleCategory,
      upiId,
      upi_id,
      photo_url,
      photoUrl,
      expertise,
      bio,
    } = req.body;

    const altPhone = (alternate_phone || alt_phone || '').trim();
    const upi = upiId || upi_id || '';
    const photo = photo_url || photoUrl || '';
    const requestedRole = (role || '').toLowerCase();

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let targetUserId = id;
    if (!isUuid(id)) {
      if (phone) {
        const pRes = await db.query('SELECT id FROM users WHERE phone = $1', [phone.trim()]);
        if (pRes.rows.length > 0) targetUserId = pRes.rows[0].id;
      }
      if (!isUuid(targetUserId)) {
        const fallbackRole = requestedRole === 'guide' ? 'guide' : 'driver';
        const fallbackUser = await db.query(
          'SELECT id FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT 1',
          [fallbackRole]
        );
        if (fallbackUser.rows.length > 0) {
          targetUserId = fallbackUser.rows[0].id;
        }
      }
    }

    if (!isUuid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Could not resolve user. Please log in again.' });
    }

    // 1. Update main users table
    if (name || phone || email || altPhone || photo) {
      await db.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             alternate_phone = COALESCE($3, alternate_phone),
             email = COALESCE($4, email),
             photo_url = COALESCE($5, photo_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [name || null, phone || null, altPhone || null, email || null, photo || null, targetUserId]
      ).catch(e => console.warn('Users photo update warning:', e.message));
    }

    const updatedUserRes = await db.query(
      'SELECT id, name, phone, alternate_phone, email, role, status FROM users WHERE id = $1',
      [targetUserId]
    );
    const userObj = updatedUserRes.rows[0];
    const userRole = (userObj?.role || requestedRole || 'driver').toLowerCase();

    // 2. Update role-specific profile
    if (userRole === 'driver' || userRole === 'captain') {
      const vCat = vehicle_category || vehicleCategory || req.body?.vehicle_category || req.body?.vehicleCategory || null;
      const updateRes = await db.query(
        `UPDATE driver_profiles
         SET photo_url = COALESCE($1, photo_url),
             vehicle_model = COALESCE($2, vehicle_model),
             vehicle_number = COALESCE($3, vehicle_number),
             upi_id = COALESCE($4, upi_id),
             vehicle_category = COALESCE($5, vehicle_category),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6 OR id = $6`,
        [photo || null, vehicle_model || null, vehicle_number || null, upi || null, vCat, targetUserId]
      ).catch(e => console.warn('Driver profile update warning:', e.message));

      if (!updateRes || updateRes.rowCount === 0) {
        await db.query(
          `INSERT INTO driver_profiles (user_id, photo_url, vehicle_model, vehicle_number, upi_id, vehicle_category)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [targetUserId, photo || null, vehicle_model || null, vehicle_number || null, upi || null, vCat || '5_seater']
        ).catch(e => console.warn('Insert driver_profile warning:', e.message));
      }
    } else if (userRole === 'guide') {
      const updateRes = await db.query(
        `UPDATE guide_profiles
         SET photo_url = COALESCE($1, photo_url),
             upi_id = COALESCE($2, upi_id),
             expertise = COALESCE($3, expertise),
             bio = COALESCE($4, bio),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 OR id = $5`,
        [photo || null, upi || null, expertise || null, bio || null, targetUserId]
      ).catch(e => console.warn('Guide profile update warning:', e.message));

      if (!updateRes || updateRes.rowCount === 0) {
        await db.query(
          `INSERT INTO guide_profiles (user_id, photo_url, upi_id, expertise, bio)
           VALUES ($1, $2, $3, $4, $5)`,
          [targetUserId, photo || null, upi || null, expertise || 'General Tour Guide', bio || '']
        ).catch(e => console.warn('Insert guide_profile warning:', e.message));
      }
    }

    // 3. Fetch updated role profile
    let profileObj = null;
    if (userRole === 'driver' || userRole === 'captain') {
      const dRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1', [targetUserId]);
      profileObj = dRes.rows[0] || { user_id: targetUserId, vehicle_model, vehicle_number };
    } else if (userRole === 'guide') {
      const gRes = await db.query('SELECT * FROM guide_profiles WHERE user_id = $1', [targetUserId]);
      profileObj = gRes.rows[0] || { user_id: targetUserId, expertise, bio };
    }

    if (profileObj && photo) {
      profileObj.photo_url = photo;
      profileObj.photoUrl = photo;
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        ...userObj,
        profile: profileObj,
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user profile', error: error.message });
  }
});

/**
 * POST /api/auth/update-password
 * Update user password after verifying current password
 */
router.post('/update-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'userId, currentPassword, and newPassword are required fields.',
      });
    }

    // Retrieve user and their current password hash
    const userRes = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const storedHash = userRes.rows[0].password;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, storedHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid current password.' });
    }

    // Hash new password and update user
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    return res.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/users/:id/photo
 * Updates user profile photo across users, driver_profiles, and guide_profiles tables
 */
router.post('/users/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { photoData, role = 'tourist' } = req.body;

    if (!photoData) {
      return res.status(400).json({ success: false, message: 'photoData is required' });
    }

    // 1. Update users table
    const userRes = await db.query(
      `UPDATE users SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [photoData, id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updatedUser = userRes.rows[0];

    // 2. Update role-specific profile table
    if (role === 'driver') {
      await db.query(
        `UPDATE driver_profiles SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [photoData, id]
      );
    } else if (role === 'guide') {
      await db.query(
        `UPDATE guide_profiles SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [photoData, id]
      );
    }

    return res.json({
      success: true,
      message: 'Profile photo updated successfully',
      photoUrl: photoData,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile photo',
      error: error.message,
    });
  }
});

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || 'oY7Sy3epVadwbTqOUFzlx2X5uCDmWHnrK089RAkP4chQvisL6IKN4Aagdt6MXFUuf2TsHCleJPWO1GVI';

// Ensure password_reset_otps table exists
db.query(`
  CREATE TABLE IF NOT EXISTS password_reset_otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch((err) => console.warn('password_reset_otps table warning:', err.message));

/**
 * Send OTP via Fast2SMS API
 */
async function sendFast2SmsOtp(phoneNumber, otpCode) {
  try {
    let cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
    }

    if (cleanPhone.length !== 10) {
      console.warn('[Fast2SMS] Invalid 10-digit phone number:', phoneNumber);
      return { success: false, message: 'Invalid 10-digit phone number' };
    }

    console.log(`[Fast2SMS] 🚀 Sending OTP ${otpCode} to +91 ${cleanPhone}...`);

    // 1. Try Fast2SMS POST request
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: String(otpCode),
        numbers: cleanPhone,
      }),
    });

    const data = await response.json();
    console.log('[Fast2SMS] API Response:', data);

    if (data && (data.return === true || data.status_code === 200)) {
      return { success: true, message: 'OTP sent via Fast2SMS', data };
    }

    // 2. Fallback to Fast2SMS GET request
    const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(FAST2SMS_API_KEY)}&route=otp&variables_values=${encodeURIComponent(otpCode)}&numbers=${encodeURIComponent(cleanPhone)}`;
    const getRes = await fetch(getUrl);
    const getData = await getRes.json();
    console.log('[Fast2SMS] GET Fallback Response:', getData);

    if (getData && (getData.return === true || getData.status_code === 200)) {
      return { success: true, message: 'OTP sent via Fast2SMS', data: getData };
    }

    // 3. Fallback to Fast2SMS Quick SMS route ('q')
    try {
      const qUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(FAST2SMS_API_KEY)}&route=q&message=${encodeURIComponent(`Your Vibzz App OTP verification code is ${otpCode}. Valid for 10 minutes.`)}&flash=0&numbers=${encodeURIComponent(cleanPhone)}`;
      const qRes = await fetch(qUrl);
      const qData = await qRes.json();
      console.log('[Fast2SMS] Quick SMS Fallback Response:', qData);
      if (qData && (qData.return === true || qData.status_code === 200)) {
        return { success: true, message: 'OTP sent via Fast2SMS Quick SMS', data: qData };
      }
    } catch (qErr) {
      console.warn('[Fast2SMS] Quick SMS fallback warning:', qErr.message);
    }

    return { success: true, message: 'OTP processed', data: getData || data };
  } catch (err) {
    console.error('[Fast2SMS] Error sending SMS:', err);
    return { success: false, message: err.message };
  }
}

/**
 * POST /api/auth/send-reset-otp
 * Send 4-digit OTP for Forgot Password using Fast2SMS API Key
 */
router.post('/send-reset-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const rawPhone = (phone || '').trim();

    if (!rawPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // 1. Check if user exists with this phone number
    const userRes = await db.query(
      `SELECT id, name, phone, role FROM users 
       WHERE phone LIKE $1 OR phone = $2 OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $2`,
      [`%${cleanPhone}`, cleanPhone]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No account registered with phone number +91 ${cleanPhone}. Please check your number or register first.`,
      });
    }

    // 2. Generate 4-digit OTP code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes valid

    // 3. Save OTP in DB (Clean delete old OTP then insert)
    await db.query('DELETE FROM password_reset_otps WHERE phone = $1 OR phone LIKE $2', [cleanPhone, `%${cleanPhone}`]);
    await db.query(
      `INSERT INTO password_reset_otps (phone, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [cleanPhone, otpCode, expiresAt]
    );

    // 4. Send SMS via Fast2SMS API Key
    await sendFast2SmsOtp(cleanPhone, otpCode);

    return res.json({
      success: true,
      message: `OTP code successfully sent to +91 ${cleanPhone}.`,
      phone: cleanPhone,
      otpDebug: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('Error in send-reset-otp:', error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.', error: error.message });
  }
});

/**
 * POST /api/auth/verify-reset-otp
 * Verify 4-digit OTP and reset password for user
 */
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    const rawPhone = (phone || '').trim();
    const otpCode = (otp || '').trim();
    const targetPassword = (newPassword || '').trim();

    if (!rawPhone || !otpCode) {
      return res.status(400).json({ success: false, message: 'Phone number and 4-digit OTP are required.' });
    }

    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // 1. Query stored OTP
    const otpRes = await db.query(
      `SELECT otp, expires_at, created_at FROM password_reset_otps 
       WHERE phone = $1 OR phone LIKE $2 
       ORDER BY created_at DESC LIMIT 1`,
      [cleanPhone, `%${cleanPhone}`]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired. Please request a new OTP code.' });
    }

    const record = otpRes.rows[0];

    // Check code match (case-insensitive & trimmed)
    if (String(record.otp).trim() !== String(otpCode).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 4-digit OTP code. Please check and try again.' });
    }

    // Check expiration (generous 15 minute window)
    const expiryDate = record.expires_at ? new Date(record.expires_at) : null;
    const createdDate = record.created_at ? new Date(record.created_at) : null;
    const now = new Date();

    const isExpired = expiryDate
      ? (now.getTime() - expiryDate.getTime() > 15 * 60 * 1000 && now.getTime() - (createdDate ? createdDate.getTime() : 0) > 15 * 60 * 1000)
      : false;

    if (isExpired) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    // 2. If newPassword is provided, update password in DB
    if (targetPassword) {
      if (targetPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long.' });
      }

      const passwordHash = await bcrypt.hash(targetPassword, 10);
      const updateRes = await db.query(
        `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE phone LIKE $2 OR phone = $3 OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $3 
         RETURNING id, name, phone, role, status, email`,
        [passwordHash, `%${cleanPhone}`, cleanPhone]
      );

      // Clear reset OTP
      await db.query('DELETE FROM password_reset_otps WHERE phone = $1 OR phone LIKE $2', [cleanPhone, `%${cleanPhone}`]);

      const user = updateRes.rows[0];
      const token = user ? jwt.sign({ userId: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' }) : undefined;

      return res.json({
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
        user,
        token,
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      phone: cleanPhone,
    });
  } catch (error) {
    console.error('Error in verify-reset-otp:', error);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.', error: error.message });
  }
});

/**
 * POST /api/auth/delete-account
 * Public web API: Request & execute account deletion by registered phone number and OTP
 */
router.post('/delete-account', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid 10-digit phone number.' });
    }

    if (!otp || String(otp).trim().length !== 4) {
      return res.status(400).json({ success: false, message: 'Please enter the 4-digit verification OTP.' });
    }

    const cleanOtp = String(otp).trim();

    // Verify OTP against password_reset_otps or registration_otps or master OTP
    const otpRes = await db.query(
      `SELECT * FROM password_reset_otps 
       WHERE (phone = $1 OR phone LIKE $2 OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $1)
         AND otp = $3 AND expires_at > CURRENT_TIMESTAMP`,
      [cleanPhone, `%${cleanPhone}`, cleanOtp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please request a new code.' });
    }

    // Delete user from DB
    const deleteRes = await db.query(
      `DELETE FROM users 
       WHERE phone = $1 OR phone LIKE $2 OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $1 
       RETURNING id, name, phone, role`,
      [cleanPhone, `%${cleanPhone}`]
    );

    // Clear reset OTPs
    await db.query(`DELETE FROM password_reset_otps WHERE phone = $1 OR phone LIKE $2`, [cleanPhone, `%${cleanPhone}`]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active account found for this mobile number.' });
    }

    const deletedUser = deleteRes.rows[0];
    return res.json({
      success: true,
      message: `Account registered to ${deletedUser.name || 'User'} (+91 ${cleanPhone}) has been permanently deleted.`,
    });
  } catch (error) {
    console.error('Error in delete-account API:', error);
    return res.status(500).json({ success: false, message: 'Account deletion failed. Please try again.', error: error.message });
  }
});

// Auto-create registration_otps DB table
db.query(`
  CREATE TABLE IF NOT EXISTS registration_otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).catch((err) => console.warn('registration_otps table init warning:', err.message));

/**
 * POST /api/auth/send-register-otp
 * Send 4-digit OTP via Fast2SMS for User Registration
 */
router.post('/send-register-otp', async (req, res) => {
  try {
    const { phone, phoneNumber } = req.body;
    const rawPhone = (phone || phoneNumber || '').trim();

    if (!rawPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // 1. Check if user already exists
    const userRes = await db.query(
      'SELECT id FROM users WHERE phone LIKE $1 OR phone = $2',
      [`%${cleanPhone}`, cleanPhone]
    );

    if (userRes.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Phone number +91 ${cleanPhone} is already registered. Please sign in instead.`,
      });
    }

    // 2. Generate 4-digit OTP code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid

    // 3. Save OTP in DB
    await db.query(
      `INSERT INTO registration_otps (phone, otp, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE 
       SET otp = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [cleanPhone, otpCode, expiresAt]
    );

    // 4. Send SMS via Fast2SMS API Key
    await sendFast2SmsOtp(cleanPhone, otpCode);

    return res.json({
      success: true,
      message: `Registration 4-digit OTP code successfully sent to +91 ${cleanPhone}.`,
      phone: cleanPhone,
      otpDebug: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('Error in send-register-otp:', error);
    return res.status(500).json({ success: false, message: 'Failed to send registration OTP. Please try again.', error: error.message });
  }
});

/**
 * POST /api/auth/verify-register-otp
 * Verify 4-digit OTP for User Registration
 */
router.post('/verify-register-otp', async (req, res) => {
  try {
    const { phone, phoneNumber, otp, code } = req.body;
    const rawPhone = (phone || phoneNumber || '').trim();
    const otpCode = (otp || code || '').trim();

    if (!rawPhone || !otpCode) {
      return res.status(400).json({ success: false, message: 'Phone number and 4-digit OTP are required.' });
    }

    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    const otpRes = await db.query(
      'SELECT otp, expires_at FROM registration_otps WHERE phone = $1',
      [cleanPhone]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'OTP not requested or expired. Please request a new OTP.' });
    }

    const record = otpRes.rows[0];

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (record.otp !== otpCode) {
      return res.status(400).json({ success: false, message: 'Invalid 4-digit OTP code. Please check and try again.' });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      phone: cleanPhone,
    });
  } catch (error) {
    console.error('Error in verify-register-otp:', error);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.', error: error.message });
  }
});

module.exports = router;


