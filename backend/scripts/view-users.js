const db = require('../config/db');

async function viewDatabaseUsers() {
  try {
    console.log('===================================================');
    console.log('📊 Vibe Database - Registered Users & Profiles');
    console.log('===================================================\n');

    // 1. Fetch Users
    const usersRes = await db.query(
      'SELECT id, name, phone, email, role, status, created_at FROM users ORDER BY created_at DESC'
    );

    if (usersRes.rows.length === 0) {
      console.log('⚠️ No users found in the "users" table yet.');
    } else {
      console.log(`📌 Total Users: ${usersRes.rows.length}\n`);
      console.table(usersRes.rows);
    }

    // 2. Fetch Driver Profiles
    const driversRes = await db.query(
      'SELECT d.id, u.name, u.phone, d.vehicle_type, d.vehicle_number, d.license_number, d.is_active FROM driver_profiles d JOIN users u ON d.user_id = u.id'
    );
    if (driversRes.rows.length > 0) {
      console.log('\n🚗 Driver Profiles:');
      console.table(driversRes.rows);
    }

    // 3. Fetch Guide Profiles
    const guidesRes = await db.query(
      'SELECT g.id, u.name, u.phone, g.expertise, g.license_id, g.is_active FROM guide_profiles g JOIN users u ON g.user_id = u.id'
    );
    if (guidesRes.rows.length > 0) {
      console.log('\n🧭 Guide Profiles:');
      console.table(guidesRes.rows);
    }

    console.log('\n===================================================');
  } catch (error) {
    console.error('❌ Error reading database:', error.message);
    console.log('\n💡 Tip: Check if PostgreSQL service is running and credentials in backend/.env are correct.');
  } finally {
    process.exit();
  }
}

viewDatabaseUsers();
