const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initDatabase() {
  console.log('🔄 Initializing PostgreSQL database tables & schema...');
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    await db.query(sqlScript);
    console.log('✅ PostgreSQL Schema initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
  } finally {
    process.exit();
  }
}

initDatabase();
