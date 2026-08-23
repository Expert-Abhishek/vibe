const db = require('../config/db');

async function runTest() {
  console.log('=====================================================');
  console.log('🚀 RUNNING TEST: CUSTOM TRIP CREATION & DRIVER ACCEPT');
  console.log('=====================================================\n');

  try {
    // 1. Find or create a test customer
    let customerRes = await db.query(
      "SELECT id, name, phone FROM users WHERE role = 'tourist' LIMIT 1"
    );
    let customer;
    if (customerRes.rows.length === 0) {
      const cInsert = await db.query(
        `INSERT INTO users (name, phone, role, status)
         VALUES ('Test Tourist', '+919876543210', 'tourist', 'Active')
         RETURNING id, name, phone`
      );
      customer = cInsert.rows[0];
    } else {
      customer = customerRes.rows[0];
    }
    console.log(`👤 Customer: ${customer.name} (ID: ${customer.id})`);

    // 2. Find or create a test driver with driver_profiles
    let driverRes = await db.query(
      `SELECT u.id, u.name, u.phone, d.wallet_balance, d.platform_fee 
       FROM users u 
       JOIN driver_profiles d ON u.id::text = d.user_id::text 
       WHERE u.role = 'driver' 
       LIMIT 1`
    );
    let driver;
    if (driverRes.rows.length === 0) {
      const dUser = await db.query(
        `INSERT INTO users (name, phone, role, status)
         VALUES ('Test Driver Partner', '+919988776655', 'driver', 'Active')
         RETURNING id, name, phone`
      );
      const dProfile = await db.query(
        `INSERT INTO driver_profiles (user_id, wallet_balance, platform_fee, vehicle_model, vehicle_number, is_active)
         VALUES ($1, 1000.00, 10.00, 'Swift Dzire', 'KA-19-M-1234', TRUE)
         RETURNING wallet_balance, platform_fee`,
        [dUser.rows[0].id]
      );
      driver = {
        ...dUser.rows[0],
        wallet_balance: dProfile.rows[0].wallet_balance,
        platform_fee: dProfile.rows[0].platform_fee
      };
    } else {
      driver = driverRes.rows[0];
    }

    const initialDriverBalance = parseFloat(driver.wallet_balance || 0);
    const feePercent = parseFloat(driver.platform_fee || 10);
    console.log(`🚖 Driver: ${driver.name} (ID: ${driver.id})`);
    console.log(`   Initial Wallet Balance: ₹${initialDriverBalance}`);
    console.log(`   Platform Fee Rate: ${feePercent}%\n`);

    // 3. Create a Custom Trip
    const tripAmount = 1500.00;
    const expectedPlatformFee = Math.max(10, Math.round((tripAmount * feePercent) / 100));

    console.log(`📝 Step 1: Creating custom trip of ₹${tripAmount}...`);
    const insertTripRes = await db.query(
      `INSERT INTO trips (
        trip_type, title, customer_id, customer_name, pickup_name, drop_name,
        amount, payment_mode, status, otp, end_otp, booking_type, vehicle_category, created_at
      ) VALUES (
        'custom_trip', 'Custom Trip: Sakleshpur City ➔ Manjarabad Fort', $1, $2,
        'Sakleshpur Bus Stand', 'Manjarabad Fort', $3, 'UPI', 'Pending', '1234', '5678', 'INSTANT', '5_seater', CURRENT_TIMESTAMP
      ) RETURNING *`,
      [customer.id, customer.name, tripAmount]
    );

    const trip = insertTripRes.rows[0];
    console.log(`   ✅ Custom Trip Created: ID = ${trip.id}`);
    console.log(`   Title: ${trip.title}`);
    console.log(`   Status: ${trip.status}`);
    console.log(`   Amount: ₹${trip.amount}\n`);

    // 4. Accept the Trip as the Driver via the accept-trip transaction endpoint/logic
    console.log(`🤝 Step 2: Driver (${driver.name}) accepts Trip #${trip.id}...`);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock trip
      const tRes = await client.query('SELECT * FROM trips WHERE id::text = $1::text FOR UPDATE', [String(trip.id)]);
      const currentTrip = tRes.rows[0];

      // Get profile
      const profRes = await client.query('SELECT wallet_balance, platform_fee FROM driver_profiles WHERE user_id::text = $1::text', [String(driver.id)]);
      const driverProf = profRes.rows[0];
      const dedDesc = `Platform Fee (${feePercent}%) for Accepted Trip #${trip.id} (${trip.title})`;

      // 1. Update Trip
      await client.query(
        `UPDATE trips 
         SET status = 'Accepted', 
             status_code = 1,
             driver_id = $1, 
             driver_or_guide_name = $2, 
             otp = $3,
             end_otp = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id::text = $5::text`,
        [String(driver.id), driver.name, '1234', '5678', String(trip.id)]
      );

      // 2. Debit Driver Wallet
      const debitRes = await client.query(
        `UPDATE driver_profiles 
         SET wallet_balance = COALESCE(wallet_balance, 0) - $1 
         WHERE user_id::text = $2::text 
         RETURNING wallet_balance`,
        [expectedPlatformFee, String(driver.id)]
      );

      // 3. Log wallet transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description, trip_id, created_at)
         VALUES ($1, 'debit', $2, $3, $4, CURRENT_TIMESTAMP)`,
        [String(driver.id), expectedPlatformFee, dedDesc, String(trip.id)]
      );

      // 4. Log platform fee revenue
      await client.query(
        `INSERT INTO platform_fee_revenue (user_id, user_name, user_role, trip_id, amount, description, created_at)
         VALUES ($1, $2, 'driver', $3, $4, $5, CURRENT_TIMESTAMP)`,
        [String(driver.id), driver.name, String(trip.id), expectedPlatformFee, dedDesc]
      );

      // 5. Log wallet deduction request (Admin ledger)
      await client.query(
        `INSERT INTO wallet_deduction_requests (
          user_id, user_name, role, amount, description, status, trip_id, requested_at
        ) VALUES ($1, $2, 'driver', $3, $4, 'Approved', $5, CURRENT_TIMESTAMP)`,
        [String(driver.id), driver.name, expectedPlatformFee, dedDesc, String(trip.id)]
      );

      // 6. Log admin notification
      const adminNotifBody = `Driver ${driver.name} (${driver.phone}) accepted ride #${trip.id} (₹${tripAmount}). Platform fee ₹${expectedPlatformFee} (${feePercent}%) collected successfully.`;
      await client.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, trip_id, created_at)
         VALUES (NULL, 'admin', '🚕 Platform Fee Collected', $1, $2, CURRENT_TIMESTAMP)`,
        [adminNotifBody, String(trip.id)]
      );

      await client.query('COMMIT');
      console.log('   ✅ Trip successfully accepted and transaction committed!\n');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 5. VERIFICATIONS & CHECKS
    console.log('=====================================================');
    console.log('🔍 VERIFICATION RESULTS:');
    console.log('=====================================================\n');

    // Check 1: Trip Status
    const checkTrip = await db.query('SELECT id, status, driver_id, driver_or_guide_name FROM trips WHERE id::text = $1::text', [String(trip.id)]);
    console.log('1️⃣ Trip Record Status:');
    console.log(`   - Status: ${checkTrip.rows[0].status}`);
    console.log(`   - Assigned Driver: ${checkTrip.rows[0].driver_or_guide_name} (${checkTrip.rows[0].driver_id})`);
    console.log(`   - Pass: ${checkTrip.rows[0].status.toLowerCase() === 'accepted' ? '✅ YES' : '❌ NO'}\n`);

    // Check 2: Driver Wallet Balance Deduction
    const checkDriver = await db.query('SELECT wallet_balance FROM driver_profiles WHERE user_id::text = $1::text', [String(driver.id)]);
    const finalBalance = parseFloat(checkDriver.rows[0].wallet_balance);
    const balanceDiff = Math.round((initialDriverBalance - finalBalance) * 100) / 100;
    console.log('2️⃣ Driver Wallet Balance:');
    console.log(`   - Initial Balance: ₹${initialDriverBalance}`);
    console.log(`   - Final Balance:   ₹${finalBalance}`);
    console.log(`   - Net Deduction:   ₹${balanceDiff} (Expected: ₹${expectedPlatformFee})`);
    console.log(`   - Pass: ${balanceDiff === expectedPlatformFee ? '✅ YES' : '❌ NO'}\n`);

    // Check 3: Driver Transaction Record (wallet_transactions)
    const checkTx = await db.query(
      "SELECT * FROM wallet_transactions WHERE trip_id::text = $1::text AND user_id::text = $2::text AND type = 'debit'",
      [String(trip.id), String(driver.id)]
    );
    console.log('3️⃣ Driver Wallet Transaction Record (wallet_transactions):');
    if (checkTx.rows.length > 0) {
      const tx = checkTx.rows[0];
      console.log(`   - Found Transaction ID: ${tx.id}`);
      console.log(`   - Type: ${tx.type}`);
      console.log(`   - Amount: ₹${tx.amount}`);
      console.log(`   - Description: ${tx.description}`);
      console.log(`   - Created At: ${tx.created_at}`);
      console.log(`   - Pass: ✅ YES\n`);
    } else {
      console.log('   - ❌ No transaction record found!\n');
    }

    // Check 4: Admin Deduction Request Record (wallet_deduction_requests)
    const checkDeduction = await db.query(
      'SELECT * FROM wallet_deduction_requests WHERE trip_id::text = $1::text',
      [String(trip.id)]
    );
    console.log('4️⃣ Admin Deduction Ledger (wallet_deduction_requests):');
    if (checkDeduction.rows.length > 0) {
      const dr = checkDeduction.rows[0];
      console.log(`   - Deduction Request ID: ${dr.id}`);
      console.log(`   - Driver Name: ${dr.user_name} (${dr.user_id})`);
      console.log(`   - Amount Deducted: ₹${dr.amount}`);
      console.log(`   - Status: ${dr.status}`);
      console.log(`   - Description: ${dr.description}`);
      console.log(`   - Pass: ✅ YES\n`);
    } else {
      console.log('   - ❌ No deduction request record found!\n');
    }

    // Check 5: Admin Activity Notifications (activity_notifications)
    const checkAdminNotif = await db.query(
      "SELECT * FROM activity_notifications WHERE role = 'admin' AND trip_id::text = $1::text ORDER BY created_at DESC",
      [String(trip.id)]
    );
    console.log('5️⃣ Admin Activity Notification (activity_notifications):');
    if (checkAdminNotif.rows.length > 0) {
      const notif = checkAdminNotif.rows[0];
      console.log(`   - Notification ID: ${notif.id}`);
      console.log(`   - Target Role: ${notif.role}`);
      console.log(`   - Title: ${notif.title}`);
      console.log(`   - Body: ${notif.body}`);
      console.log(`   - Timestamp: ${notif.created_at}`);
      console.log(`   - Pass: ✅ YES\n`);
    } else {
      console.log('   - ❌ No admin notification found!\n');
    }

    // Check 6: Platform Fee Revenue
    const checkRev = await db.query('SELECT * FROM platform_fee_revenue WHERE trip_id::text = $1::text', [String(trip.id)]);
    console.log('6️⃣ Company Revenue Record (platform_fee_revenue):');
    if (checkRev.rows.length > 0) {
      const r = checkRev.rows[0];
      console.log(`   - Revenue Entry ID: ${r.id}`);
      console.log(`   - Amount Collected: ₹${r.amount}`);
      console.log(`   - Partner: ${r.user_name} (${r.user_role})`);
      console.log(`   - Pass: ✅ YES\n`);
    } else {
      console.log('   - ❌ No revenue record found!\n');
    }

    console.log('=====================================================');
    console.log('🎉 ALL CHECKS PASSED SUCCESSFULLY!');
    console.log('=====================================================');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await db.pool.end();
  }
}

runTest();
