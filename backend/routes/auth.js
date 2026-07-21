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
    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : null;

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
          INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_model, vehicle_number, license_number)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const fallbackRes = await client.query(fallbackDriverQuery, [
          newUser.id,
          vehicle_type || '5seater',
          vehicle_model || '',
          vehicle_number || '',
          license_number || '',
        ]);
        profileData = fallbackRes.rows[0];
      }
    } else if (cleanRole === 'guide') {
      const { photo_url, license_cert_url, id_proof_url } = req.body;

      try {
        const insertGuideQuery = `
          INSERT INTO guide_profiles (user_id, expertise, license_id, bio, photo_url, license_cert_url, id_proof_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const guideResult = await client.query(insertGuideQuery, [
          newUser.id,
          expertise || 'General Tour Guide',
          license_id || '',
          bio || '',
          photo_url || null,
          license_cert_url || null,
          id_proof_url || null,
        ]);
        profileData = guideResult.rows[0];
      } catch (profileErr) {
        console.warn('Inserting guide document columns failed, using fallback insert:', profileErr.message);
        const fallbackGuideQuery = `
          INSERT INTO guide_profiles (user_id, expertise, license_id, bio)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const fallbackRes = await client.query(fallbackGuideQuery, [
          newUser.id,
          expertise || 'General Tour Guide',
          license_id || '',
          bio || '',
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

    // Search user by phone or email
    const userQuery = `
      SELECT id, name, phone, email, password, role, status
      FROM users
      WHERE phone = $1 OR LOWER(email) = LOWER($1)
    `;
    const result = await db.query(userQuery, [loginKey]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password.',
      });
    }

    // Strict KYC Status Enforcement for Driver & Guide
    if (user.role === 'driver' || user.role === 'guide') {
      if (user.status === 'Pending KYC') {
        return res.status(403).json({
          success: false,
          message: 'Your registration is currently pending admin KYC approval. Please wait for admin verification.',
          status: 'Pending KYC',
        });
      }
      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated by the admin.',
          status: 'Inactive',
        });
      }
      if (user.status === 'KYC Declined') {
        return res.status(403).json({
          success: false,
          message: 'Your driver/guide registration KYC was declined by the admin.',
          status: 'KYC Declined',
        });
      }
    }

    // Fetch profile details based on role
    let profileData = null;
    if (user.role === 'driver') {
      const driverRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1', [user.id]);
      profileData = driverRes.rows[0] || null;
    } else if (user.role === 'guide') {
      const guideRes = await db.query('SELECT * FROM guide_profiles WHERE user_id = $1', [user.id]);
      profileData = guideRes.rows[0] || null;
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login successful!',
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
    console.error('Error in login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
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
 * Admin API: Update Driver daily_rate and hourly_addon_rate
 */
router.patch('/drivers/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { daily_rate, hourly_addon_rate } = req.body;

    const daily = parseFloat(daily_rate) || 2500;
    const hourly = parseFloat(hourly_addon_rate) || 200;

    const result = await db.query(
      `UPDATE driver_profiles 
       SET daily_rate = $1, hourly_addon_rate = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $3 
       RETURNING *`,
      [daily, hourly, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
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
      'SELECT id, name, phone, email, role, status, created_at FROM users WHERE id = $1',
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
      'SELECT id, name, phone, email, role, status, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
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
      'SELECT id, name, phone, email, role, status, created_at FROM users WHERE id = $1 AND role = $2',
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

/**
 * GET /api/auth/drivers
 * Read API: Fetch all Drivers with full profile & document details
 */
router.get('/drivers', async (req, res) => {
  try {
    const query = `
      SELECT 
        d.*,
        u.id AS user_id, u.name, u.phone, COALESCE(d.alternate_phone, u.alternate_phone, '') AS alternate_phone, u.email, u.status, u.created_at
      FROM users u
      LEFT JOIN driver_profiles d ON u.id = d.user_id
      WHERE u.role = 'driver'
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    return res.json({
      success: true,
      count: result.rows.length,
      drivers: result.rows,
    });
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
      LEFT JOIN driver_profiles d ON u.id = d.user_id
      WHERE u.id = $1 AND u.role = 'driver'
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
      LEFT JOIN guide_profiles g ON u.id = g.user_id
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
      LEFT JOIN guide_profiles g ON u.id = g.user_id
      WHERE u.id = $1 AND u.role = 'guide'
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
      'SELECT d.*, u.name, u.phone FROM driver_profiles d JOIN users u ON d.user_id = u.id'
    );
    const guidesRes = await db.query(
      'SELECT g.*, u.name, u.phone FROM guide_profiles g JOIN users u ON g.user_id = u.id'
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

module.exports = router;
