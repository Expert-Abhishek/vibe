const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const destinationsRoutes = require('./routes/destinations');
const plansRoutes = require('./routes/plans');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/plans', plansRoutes);


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
    service: 'Vibe App - Node.js + PostgreSQL Registration Server',
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
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS rc_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS dl_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS insurance_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS aadhar_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_front_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_left_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_right_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS car_back_url TEXT;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 2500.00;
      ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS hourly_addon_rate NUMERIC(10,2) DEFAULT 200.00;

      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS license_cert_url TEXT;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS id_proof_url TEXT;
      ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2) DEFAULT 2000.00;

      CREATE TABLE IF NOT EXISTS destinations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          image_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          images TEXT[] DEFAULT '{}',
          videos TEXT[] DEFAULT '{}',
          is_active BOOLEAN DEFAULT TRUE,
          order_index INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS plan_checkpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
          checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT TRUE,
          order_index INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_plan_checkpoint UNIQUE (plan_id, checkpoint_id)
      );
    `);
    console.log('✅ PostgreSQL Schema verified & migrated successfully.');
  } catch (err) {
    console.warn('⚠️ Database schema boot status:', err.message);
  }
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`🚀 Vibe Registration Backend running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 Live DB Viewer in Chrome: http://localhost:${PORT}/view-db`);
  console.log(`👉 Register API: http://localhost:${PORT}/api/auth/register`);
  console.log(`===================================================`);
  await initTablesOnBoot();
});
