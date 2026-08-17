const compression = require('compression');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const db = require('./config/db');
const { initSocket } = require('./config/socket');
const authRoutes = require('./routes/auth');
const destinationsRoutes = require('./routes/destinations');
const plansRoutes = require('./routes/plans');
const tripsRoutes = require('./routes/trips');
const walletRoutes = require('./routes/wallet');
const notificationsRoutes = require('./routes/notifications');
const vouchersRoutes = require('./routes/vouchers');

dotenv.config();

const app = express();
const server = http.createServer(app);
initSocket(server);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// URL Rewrite Middleware for Admin / Wallet Compatibility
app.use((req, res, next) => {
  if (req.url.startsWith('/api/admin/vouchers')) {
    req.url = req.url.replace('/api/admin/vouchers', '/api/vouchers');
  } else if (req.url.startsWith('/api/admin/payment-settings')) {
    req.url = req.url.replace('/api/admin/payment-settings', '/api/wallet/admin/payment-settings');
  } else if (req.url.startsWith('/api/admin/wallet/topup-requests')) {
    req.url = req.url.replace('/api/admin/wallet/topup-requests', '/api/wallet/admin/topup-requests');
  } else if (req.url.startsWith('/api/admin/wallet/deduction-requests')) {
    req.url = req.url.replace('/api/admin/wallet/deduction-requests', '/api/wallet/admin/deduction-requests');
  } else if (req.url.startsWith('/api/admin/wallet/reconciliation')) {
    req.url = req.url.replace('/api/admin/wallet/reconciliation', '/api/wallet/admin/reconciliation');
  } else if (req.url.startsWith('/api/admin/users/') && req.url.includes('/wallet-history')) {
    req.url = req.url.replace('/api/admin/users/', '/api/wallet/admin/users/');
  } else if (req.url.startsWith('/api/users/') && req.url.includes('/photo')) {
    req.url = req.url.replace('/api/users/', '/api/auth/users/');
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/stations', tripsRoutes);
app.use('/api/v1/stations', tripsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/vouchers', vouchersRoutes);




// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Vibe Registration API is running',
      database: 'connected',
      timestamp: dbResult.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Vibe Registration API running, but database connection failed',
      database_error: error.message,
    });
  }
});

// Chrome Browser Database Viewer UI Endpoint (/view-db)
app.get('/view-db', async (req, res) => {
  try {
    const usersRes = await db.query(
      'SELECT id, name, phone, email, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    const driversRes = await db.query(
      'SELECT d.id, u.name, u.phone, d.vehicle_type, d.vehicle_model, d.vehicle_number, d.license_number FROM driver_profiles d JOIN users u ON d.user_id = u.id'
    );
    const guidesRes = await db.query(
      'SELECT g.id, u.name, u.phone, g.expertise, g.license_id FROM guide_profiles g JOIN users u ON g.user_id = u.id'
    );

    const usersHtml = usersRes.rows.length === 0
      ? '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #888;">No users registered yet</td></tr>'
      : usersRes.rows.map(u => `
        <tr>
          <td style="font-family: monospace; font-size: 12px; color: #7f8c8d;">${u.id}</td>
          <td style="font-weight: bold;">${u.name}</td>
          <td>${u.phone}</td>
          <td>${u.email || '<span style="color:#777;">N/A</span>'}</td>
          <td><span class="badge badge-${u.role}">${u.role.toUpperCase()}</span></td>
          <td><span class="badge badge-status">${u.status}</span></td>
          <td style="font-size: 12px; color: #a0a0a0;">${new Date(u.created_at).toLocaleString()}</td>
        </tr>
      `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vibe Database Viewer - Live Users</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b132b; color: #e0e6ed; padding: 30px; }
          .container { max-width: 1100px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #1c2a4e; }
          h1 { color: #f5c518; font-size: 24px; font-weight: 700; }
          .subtitle { color: #8d99ae; font-size: 14px; margin-top: 4px; }
          .btn-refresh { background: #1c2a4e; color: #f5c518; border: 1px solid #f5c518; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; text-decoration: none; font-weight: 600; }
          .btn-refresh:hover { background: #f5c518; color: #0b132b; }
          .card { background: #1c2a4e; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          .card-title { font-size: 18px; color: #ffffff; margin-bottom: 16px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th, td { padding: 12px 16px; border-bottom: 1px solid #2a3b63; }
          th { background: #152238; color: #8d99ae; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          tr:hover { background: #233458; }
          .badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-tourist { background: #1d3557; color: #48cae4; }
          .badge-driver { background: #386641; color: #a7c957; }
          .badge-guide { background: #6b2d5c; color: #f72585; }
          .badge-status { background: #2b2d42; color: #edf2f4; border: 1px solid #457b9d; }
          .counter { background: #f5c518; color: #0b132b; padding: 2px 10px; border-radius: 10px; font-size: 13px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1>🚖 Vibe Database Live Viewer</h1>
              <div class="subtitle">Real-time PostgreSQL Users & Profiles</div>
            </div>
            <a href="/view-db" class="btn-refresh">🔄 Refresh Data</a>
          </div>

          <div class="card">
            <div class="card-title">
              <span>👥 Registered Users</span>
              <span class="counter">${usersRes.rows.length} Total</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>UUID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>KYC Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${usersHtml}
              </tbody>
            </table>
          </div>

          ${driversRes.rows.length > 0 ? `
          <div class="card">
            <div class="card-title">
              <span>🚗 Driver Profiles</span>
              <span class="counter">${driversRes.rows.length} Drivers</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Phone</th>
                  <th>Vehicle Type</th>
                  <th>Vehicle Model</th>
                  <th>Vehicle Number</th>
                  <th>License No</th>
                </tr>
              </thead>
              <tbody>
                ${driversRes.rows.map(d => `
                  <tr>
                    <td style="font-weight: bold;">${d.name}</td>
                    <td>${d.phone}</td>
                    <td>${d.vehicle_type}</td>
                    <td>${d.vehicle_model || 'N/A'}</td>
                    <td><span style="font-family: monospace; color:#f5c518;">${d.vehicle_number || 'N/A'}</span></td>
                    <td>${d.license_number || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${guidesRes.rows.length > 0 ? `
          <div class="card">
            <div class="card-title">
              <span>🧭 Guide Profiles</span>
              <span class="counter">${guidesRes.rows.length} Guides</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Guide Name</th>
                  <th>Phone</th>
                  <th>Expertise</th>
                  <th>License ID</th>
                </tr>
              </thead>
              <tbody>
                ${guidesRes.rows.map(g => `
                  <tr>
                    <td style="font-weight: bold;">${g.name}</td>
                    <td>${g.phone}</td>
                    <td>${g.expertise}</td>
                    <td><span style="font-family: monospace; color:#f5c518;">${g.license_id || 'N/A'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>

        <script>
          // Auto refresh page every 15 seconds
          setTimeout(() => { location.reload(); }, 15000);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error rendering database viewer:', error);
    res.status(500).send(`<h3>Error reading database: ${error.message}</h3>`);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Vibzz App - Node.js + PostgreSQL Registration Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      view_database_in_chrome: 'GET /view-db',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      user_profile: 'GET /api/auth/me',
      users_json: 'GET /api/auth/users-list',
    },
  });
});

// Auto-create & migrate database tables on server boot
async function initTablesOnBoot() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlScript = fs.readFileSync(schemaPath, 'utf8');
      await db.query(sqlScript);
    }
    // Auto-migrate missing columns for existing PostgreSQL tables
    await db.query(`
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(15);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
      ALTER TABLE users ALTER COLUMN push_token TYPE TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'dark';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE driver_profiles ALTER COLUMN photo_url TYPE TEXT;
      ALTER TABLE guide_profiles ALTER COLUMN photo_url TYPE TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS rc_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS dl_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS insurance_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS aadhar_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_front_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_left_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_right_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_back_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 2500.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_name TEXT;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_name TEXT;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lat NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS drop_lng NUMERIC(10,6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS otp VARCHAR(10);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS end_otp VARCHAR(10);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_id UUID;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS guide_id UUID;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS hourly_addon_rate NUMERIC(10,2) DEFAULT 200.00;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) DEFAULT 10.00;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(15);
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS id_proof_url TEXT;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 2000.00;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(15);
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

      DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum') THEN
              CREATE TYPE booking_type_enum AS ENUM ('instant', 'prebook');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode_enum') THEN
              CREATE TYPE payment_mode_enum AS ENUM ('cash', 'wallet');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
              CREATE TYPE trip_status_enum AS ENUM ('pending', 'accepted', 'scheduled', 'ongoing', 'completed', 'cancelled');
          END IF;
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'booking_type') THEN
              IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'booking_type') != 'USER-DEFINED' THEN
                  ALTER TABLE trips ALTER COLUMN booking_type DROP DEFAULT;
                  ALTER TABLE trips ALTER COLUMN booking_type TYPE booking_type_enum USING (
                      CASE 
                          WHEN booking_type = 'PRE_BOOKED' THEN 'prebook'::booking_type_enum 
                          ELSE 'instant'::booking_type_enum 
                      END
                  );
                  ALTER TABLE trips ALTER COLUMN booking_type SET DEFAULT 'instant'::booking_type_enum;
              END IF;
          ELSE
              ALTER TABLE trips ADD COLUMN booking_type booking_type_enum DEFAULT 'instant'::booking_type_enum;
          END IF;
      EXCEPTION
          WHEN others THEN null;
      END $$;

      DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'payment_mode') THEN
              IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'payment_mode') != 'USER-DEFINED' THEN
                  ALTER TABLE trips ALTER COLUMN payment_mode DROP DEFAULT;
                  ALTER TABLE trips ALTER COLUMN payment_mode TYPE payment_mode_enum USING (
                      CASE 
                          WHEN LOWER(payment_mode) LIKE '%wallet%' THEN 'wallet'::payment_mode_enum 
                          ELSE 'cash'::payment_mode_enum 
                      END
                  );
                  ALTER TABLE trips ALTER COLUMN payment_mode SET DEFAULT 'cash'::payment_mode_enum;
              END IF;
          ELSE
              ALTER TABLE trips ADD COLUMN payment_mode payment_mode_enum DEFAULT 'cash'::payment_mode_enum;
          END IF;
      EXCEPTION
          WHEN others THEN null;
      END $$;

      ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_date_time TIMESTAMP WITH TIME ZONE NULL;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2) DEFAULT 0.00;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_otp VARCHAR(6);
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS end_otp VARCHAR(6);

      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS total_trips INT DEFAULT 0;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS total_km NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(10,2) DEFAULT 0.00;

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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles (user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_guide_profiles_user_id ON guide_profiles (user_id);


      CREATE TABLE IF NOT EXISTS destinations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          description TEXT,
          images TEXT[] DEFAULT '{}',
          videos TEXT[] DEFAULT '{}',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE destinations ADD COLUMN IF NOT EXISTS location VARCHAR(255);
      ALTER TABLE destinations ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
      ALTER TABLE destinations ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';
      ALTER TABLE destinations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6) DEFAULT 15.335000;
      ALTER TABLE destinations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6) DEFAULT 76.460000;


      CREATE TABLE IF NOT EXISTS plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          km NUMERIC(10,2) DEFAULT 0.00,
          duration VARCHAR(100) NOT NULL DEFAULT '1 Day',
          price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE plans ADD COLUMN IF NOT EXISTS allowed_vehicles JSONB DEFAULT '{"5_seater": true, "7_seater": true, "4x4": true, "auto": true}'::jsonb;

      CREATE TABLE IF NOT EXISTS plan_checkpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
          destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT TRUE,
          order_index INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE plan_checkpoints ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE;
      ALTER TABLE plan_checkpoints ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE plan_checkpoints ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

      DO $$ 
      BEGIN 
        -- 1. Drop old foreign key constraint on checkpoint_id if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'plan_checkpoints_checkpoint_id_fkey'
        ) THEN
          ALTER TABLE plan_checkpoints DROP CONSTRAINT plan_checkpoints_checkpoint_id_fkey;
        END IF;

        -- 2. Drop NOT NULL constraint on checkpoint_id if present
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='plan_checkpoints' AND column_name='checkpoint_id'
        ) THEN
          ALTER TABLE plan_checkpoints ALTER COLUMN checkpoint_id DROP NOT NULL;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS wallet_deduction_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          user_name VARCHAR(255),
          role VARCHAR(20) DEFAULT 'tourist',
          amount NUMERIC(10,2) NOT NULL,
          description TEXT,
          screenshot_url TEXT,
          status VARCHAR(20) DEFAULT 'Pending',
          requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          reviewed_by UUID,
          reviewed_at TIMESTAMP WITH TIME ZONE,
          reject_reason TEXT
      );
    `);




    // Auto-seed Demo Destination and Demo Plan if DB is empty
    const destCountRes = await db.query('SELECT COUNT(*) FROM destinations');
    if (parseInt(destCountRes.rows[0].count, 10) === 0) {
      const seedDest = await db.query(
        `INSERT INTO destinations (name, location, description, images, videos, latitude, longitude, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          'Virupaksha Temple',
          'Hampi, Karnataka',
          '7th century functional temple complex dedicated to Lord Shiva featuring a majestic 160ft gopuram tower.',
          ['https://images.unsplash.com/photo-1600100397608-f090742f40eb?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80'],
          ['https://www.w3schools.com/html/mov_bbb.mp4'],
          15.335000,
          76.460000,
          true
        ]
      );
      const destId = seedDest.rows[0].id;

      const planCountRes = await db.query('SELECT COUNT(*) FROM plans');
      if (parseInt(planCountRes.rows[0].count, 10) === 0) {
        const seedPlan = await db.query(
          `INSERT INTO plans (name, description, km, duration, price, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            'Demo Tour Package - Hampi Express',
            'Complete guided tour of Vijayanagara empire monuments, royal enclosures, and sunset viewpoints.',
            150,
            '2 Days / 1 Night',
            4999,
            true
          ]
        );
        const planId = seedPlan.rows[0].id;

        await db.query(
          `INSERT INTO plan_checkpoints (plan_id, destination_id, order_index, is_active)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [planId, destId, 0, true]
        );
      }
    }

    // Performance Optimization: Create Indexes for ultra-fast query execution (<1ms)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_driver_profiles_active ON driver_profiles(is_active);
      CREATE INDEX IF NOT EXISTS idx_guide_profiles_user_id ON guide_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_trips_customer_id ON trips(customer_id);
      CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
      CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
      CREATE INDEX IF NOT EXISTS idx_plan_checkpoints_plan_id ON plan_checkpoints(plan_id);
      CREATE INDEX IF NOT EXISTS idx_plan_checkpoints_dest_id ON plan_checkpoints(destination_id);
    `).catch(e => console.warn('Indexes creation status:', e.message));

    console.log('✅ PostgreSQL Schema & DB Indexes verified successfully.');
  } catch (err) {
    console.warn('⚠️ Database schema boot status:', err.message);
  }
}

// Standalone Web Route for Google Play Console Account Deletion Policy
app.get('/delete-account', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibzz - Account Deletion Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #101014; color: #f4f3f4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background-color: #1a1a20; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .icon-badge { width: 56px; height: 56px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #ef4444; font-size: 24px; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px; }
    p.subtitle { font-size: 13px; color: #a1a1aa; line-height: 1.5; }
    .notice-box { background-color: rgba(245, 197, 24, 0.08); border: 1px solid rgba(245, 197, 24, 0.2); border-radius: 12px; padding: 12px; font-size: 12px; color: #f5c518; margin-bottom: 20px; line-height: 1.4; }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #d4d4d8; margin-bottom: 8px; }
    .input-wrapper { position: relative; }
    .prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #a1a1aa; font-weight: 700; font-size: 14px; }
    input { width: 100%; background-color: #24242c; border: 1px solid #33333e; border-radius: 12px; padding: 14px 14px 14px 48px; color: #ffffff; font-size: 15px; font-weight: 600; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #ef4444; }
    input.otp-input { padding: 14px; text-align: center; font-size: 20px; letter-spacing: 8px; font-weight: 800; }
    .btn { width: 100%; background-color: #ef4444; color: #ffffff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; margin-top: 6px; }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background-color: transparent; border: 1px solid #33333e; color: #a1a1aa; margin-top: 10px; font-weight: 600; font-size: 13px; }
    .btn-secondary:hover { background-color: #24242c; color: #fff; }
    .alert { padding: 12px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; display: none; }
    .alert-error { background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
    .alert-success { background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; }
    .footer-policy { border-top: 1px solid #282832; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #71717a; line-height: 1.5; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon-badge">🗑️</div>
      <h1>Delete Vibzz Account</h1>
      <p class="subtitle">Official Google Play Data Safety Account Deletion Portal</p>
    </div>

    <div class="notice-box">
      ⚠️ <strong>Account Data Deletion Disclosure:</strong> Requesting account deletion will permanently purge your user profile, saved trips, mobile registration, vehicle logs, and notification tokens.
    </div>

    <div id="alert-box" class="alert"></div>

    <!-- Step 1 Form: Phone Number -->
    <div id="step-phone">
      <div class="form-group">
        <label>Registered Mobile Phone Number</label>
        <div class="input-wrapper">
          <span class="prefix">+91</span>
          <input type="tel" id="phone" placeholder="Enter number" maxlength="10">
        </div>
      </div>
      <button class="btn" id="btn-send" onclick="sendOtp()">Send Verification SMS Code</button>
    </div>

    <!-- Step 2 Form: Verification OTP -->
    <div id="step-otp" style="display: none;">
      <div class="form-group">
        <label>4-Digit SMS Code Sent to <span id="display-phone" style="color:#f5c518"></span></label>
        <input type="text" id="otp" class="otp-input" placeholder="0000" maxlength="4">
      </div>
      <button class="btn" id="btn-delete" onclick="confirmDelete()">Permanently Delete Account</button>
      <button class="btn btn-secondary" onclick="backToPhone()">Change Phone Number</button>
    </div>

    <!-- Step 3: Success Confirmation -->
    <div id="step-success" style="display: none; text-align: center; padding: 10px 0;">
      <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
      <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-bottom: 8px;">Account Deleted Successfully</h2>
      <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5;" id="success-message">
        Your user profile and associated data have been permanently purged from Vibzz platform.
      </p>
    </div>

    <div class="footer-policy">
      Support Contact: privacy@vibzz.com | Hotline: +91 96508 30901<br>
      © Vibzz Platform. All rights reserved.
    </div>
  </div>

  <script>
    // Auto-populate phone from URL query string ?phone=9876543210
    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get('phone');
    if (phoneParam) {
      const clean = phoneParam.replace(/\\D/g, '').slice(-10);
      if (clean) document.getElementById('phone').value = clean;
    }

    function showAlert(msg, isSuccess = false) {
      const box = document.getElementById('alert-box');
      box.className = 'alert ' + (isSuccess ? 'alert-success' : 'alert-error');
      box.innerText = msg;
      box.style.display = 'block';
    }

    function hideAlert() {
      document.getElementById('alert-box').style.display = 'none';
    }

    async function sendOtp() {
      hideAlert();
      const phoneInput = document.getElementById('phone').value.replace(/\\D/g, '').slice(-10);
      if (!phoneInput || phoneInput.length !== 10) {
        showAlert('Please enter a valid 10-digit mobile phone number.');
        return;
      }

      const btn = document.getElementById('btn-send');
      btn.disabled = true;
      btn.innerText = 'Sending SMS Code...';

      try {
        const res = await fetch('/api/auth/send-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneInput })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Send Verification SMS Code';

        if (data.success) {
          document.getElementById('display-phone').innerText = '+91 ' + phoneInput;
          document.getElementById('step-phone').style.display = 'none';
          document.getElementById('step-otp').style.display = 'block';
          showAlert('4-Digit Verification SMS Code sent to +91 ' + phoneInput, true);
        } else {
          showAlert(data.message || 'No registered user found with this mobile number.');
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Send Verification SMS Code';
        showAlert('Connection error. Please check your internet connection.');
      }
    }

    async function confirmDelete() {
      hideAlert();
      const phoneInput = document.getElementById('phone').value.replace(/\\D/g, '').slice(-10);
      const otpInput = document.getElementById('otp').value.trim();

      if (!otpInput || otpInput.length !== 4) {
        showAlert('Please enter the 4-digit SMS verification code.');
        return;
      }

      const btn = document.getElementById('btn-delete');
      btn.disabled = true;
      btn.innerText = 'Deleting Account...';

      try {
        const res = await fetch('/api/auth/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneInput, otp: otpInput })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Permanently Delete Account';

        if (data.success) {
          document.getElementById('step-otp').style.display = 'none';
          document.getElementById('step-success').style.display = 'block';
          if (data.message) document.getElementById('success-message').innerText = data.message;
          hideAlert();
        } else {
          showAlert(data.message || 'Account deletion failed. Invalid SMS Code.');
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Permanently Delete Account';
        showAlert('Connection error during deletion request.');
      }
    }

    function backToPhone() {
      hideAlert();
      document.getElementById('step-otp').style.display = 'none';
      document.getElementById('step-phone').style.display = 'block';
    }
  </script>
</body>
</html>
  `);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Start Server with Socket.io WebSockets Support
server.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`🚀 Vibe Registration Backend running on port ${PORT}`);
  console.log(`🔌 WebSockets / Socket.io initialized on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 Live DB Viewer in Chrome: http://localhost:${PORT}/view-db`);
  console.log(`👉 Register API: http://localhost:${PORT}/api/auth/register`);
  console.log(`===================================================`);
  await initTablesOnBoot();
});
