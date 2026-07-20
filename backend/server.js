const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Vibe App - Node.js + PostgreSQL Registration Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      user_profile: 'GET /api/auth/me',
    },
  });
});

// Auto-create database tables on server boot
async function initTablesOnBoot() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlScript = fs.readFileSync(schemaPath, 'utf8');
      await db.query(sqlScript);
      console.log('✅ PostgreSQL Schema verified/initialized successfully.');
    }
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
  console.log(`👉 Register API: http://localhost:${PORT}/api/auth/register`);
  console.log(`===================================================`);
  await initTablesOnBoot();
});
