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
      INSERT INTO users (name, phone, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, phone, email, role, status, created_at
    `;
    const userResult = await client.query(insertUserQuery, [
      name.trim(),
      cleanPhone,
      cleanEmail,
      passwordHash,
      cleanRole,
      initialStatus,
    ]);

    const newUser = userResult.rows[0];
    let profileData = null;

    // 5. Create role specific profile
    if (cleanRole === 'driver') {
      const insertDriverQuery = `
        INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_model, vehicle_number, license_number)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const driverResult = await client.query(insertDriverQuery, [
        newUser.id,
        vehicle_type || '5seater',
        vehicle_model || '',
        vehicle_number || '',
        license_number || '',
      ]);
      profileData = driverResult.rows[0];
    } else if (cleanRole === 'guide') {
      const insertGuideQuery = `
        INSERT INTO guide_profiles (user_id, expertise, license_id, bio)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const guideResult = await client.query(insertGuideQuery, [
        newUser.id,
        expertise || 'General Tour Guide',
        license_id || '',
        bio || '',
      ]);
      profileData = guideResult.rows[0];
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
 * Read API: Fetch all Drivers with profile details
 */
router.get('/drivers', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id AS user_id, u.name, u.phone, u.email, u.status, u.created_at,
        d.id AS driver_profile_id, d.vehicle_type, d.vehicle_model, d.vehicle_number, 
        d.license_number, d.is_active, d.rating, d.wallet_balance
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
        u.id AS user_id, u.name, u.phone, u.email, u.status, u.created_at,
        d.id AS driver_profile_id, d.vehicle_type, d.vehicle_model, d.vehicle_number, 
        d.license_number, d.is_active, d.rating, d.wallet_balance
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
 * Read API: Fetch all Guides with profile details
 */
router.get('/guides', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id AS user_id, u.name, u.phone, u.email, u.status, u.created_at,
        g.id AS guide_profile_id, g.expertise, g.license_id, g.bio, 
        g.is_active, g.rating, g.wallet_balance
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
        u.id AS user_id, u.name, u.phone, u.email, u.status, u.created_at,
        g.id AS guide_profile_id, g.expertise, g.license_id, g.bio, 
        g.is_active, g.rating, g.wallet_balance
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
