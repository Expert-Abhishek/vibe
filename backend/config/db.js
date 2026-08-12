const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

let poolConfig;

if (connectionString) {
  const isLocalHost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  poolConfig = {
    connectionString,
    ssl: (isLocalHost && process.env.DISABLE_DB_SSL === 'true') ? false : { rejectUnauthorized: false },
    max: 25,
    min: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  };
} else {
  poolConfig = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'vibe_db',
    max: 25,
    min: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

// Warm up DB pool immediately on start to prevent first-login connection timeouts
pool.query('SELECT 1').then(() => {
  console.log('✅ PostgreSQL Database pool warmed up successfully.');
}).catch((err) => {
  console.warn('⚠️ Initial PostgreSQL warm-up query warning:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
