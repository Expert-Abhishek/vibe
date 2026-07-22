const db = require('../config/db');

async function clearDatabase() {
  console.log('🔄 Truncating all database tables to clear all data...');
  try {
    const truncateQuery = `
      TRUNCATE TABLE trips, plan_checkpoints, plans, destinations, driver_profiles, guide_profiles, users CASCADE;
    `;
    await db.query(truncateQuery);
    console.log('✅ All database tables cleared successfully (0 records remain)!');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    process.exit();
  }
}

clearDatabase();
