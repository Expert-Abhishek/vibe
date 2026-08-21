const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');
const { emitNotification, emitWalletUpdate } = require('../config/socket');

const router = express.Router();

const { sendPushToUser } = require('../services/expoPushService');

async function logWalletNotification(userId, role, title, body) {
  try {
    await db.query(
      `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId || null, role || 'tourist', title, body]
    );
    emitNotification({ userId, role: role || 'tourist', title, body });
    emitWalletUpdate({ userId, role: role || 'tourist', description: body });
    if (userId) {
      sendPushToUser(userId, {
        title,
        body,
        collapseKey: 'wallet_alert',
        channelId: 'default',
      });
    }
  } catch (err) {
    console.warn('logWalletNotification error:', err.message);
  }
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_Cqz1hMxOW8QFj3',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'J61PkpPzNvE2QJNXet5bKG6D',
});

/**
 * GET /api/wallet/checkout-page
 * Renders official Razorpay Checkout Gateway UI HTML Page for Mobile WebBrowser Fallback
 */
router.get('/checkout-page', (req, res) => {
  const amount = req.query.amount || '500';
  const title = req.query.title || 'Vibe Wallet Top-Up';
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_Cqz1hMxOW8QFj3';
  const amountInPaise = Math.round(parseFloat(amount) * 100);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vibe Razorpay Gateway</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body { background-color: #101014; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .loader { border: 4px solid #333; border-top: 4px solid #F5C518; border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite; margin-bottom: 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { color: #F5C518; font-weight: 700; font-size: 18px; text-align: center; }
          p { color: #888; font-size: 13px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <h2>Launching Official Razorpay Gateway...</h2>
        <p>Please wait, opening PhonePe, Google Pay, UPI & Cards...</p>
        <script>
          var options = {
            key: "${keyId}",
            amount: ${amountInPaise},
            currency: "INR",
            name: "Vibe Tour & Travel",
            description: "${title}",
            theme: { color: "#F5C518" },
            handler: function (response) {
              window.location.href = "vibe://payment-success?payment_id=" + response.razorpay_payment_id;
            },
            modal: {
              ondismiss: function () {
                window.location.href = "vibe://payment-cancelled";
              }
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            window.location.href = "vibe://payment-cancelled";
          });
          rzp.open();
        </script>
      </body>
    </html>
  `);
});

/**
 * GET /api/wallet/:userId
 * Fetch user or driver/guide wallet balance and transaction history
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check user role to find balance
    const userRes = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.json({ success: true, balance: 0, transactions: [] });
    }

    const role = userRes.rows[0].role;
    let balance = 0;

    if (role === 'driver') {
      const dRes = await db.query('SELECT wallet_balance FROM driver_profiles WHERE user_id = $1', [userId]);
      balance = parseFloat(dRes.rows[0]?.wallet_balance || 0);
    } else if (role === 'guide') {
      const gRes = await db.query('SELECT wallet_balance FROM guide_profiles WHERE user_id = $1', [userId]);
      balance = parseFloat(gRes.rows[0]?.wallet_balance || 0);
    } else {
      // Tourist wallet
      const txSum = await db.query(
        "SELECT COALESCE(SUM(CASE WHEN LOWER(type) = 'topup' OR LOWER(type) = 'refund' THEN amount WHEN LOWER(type) = 'withdrawal' OR LOWER(type) = 'debit' THEN -amount ELSE 0 END), 0) AS total FROM wallet_transactions WHERE user_id = $1",
        [userId]
      );
      balance = parseFloat(txSum.rows[0]?.total || 0);
    }

    const txRes = await db.query(
      'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    const withdrawalsRes = await db.query(
      'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    res.json({
      success: true,
      balance,
      transactions: txRes.rows,
      withdrawals: withdrawalsRes.rows,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet data', error: error.message });
  }
});

/**
 * POST /api/wallet/create-order
 * Step 1: Create Razorpay Order ID on server
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_live_Cqz1hMxOW8QFj3',
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
  }
});

/**
 * POST /api/wallet/verify-payment
 * Step 2: Verify Razorpay Payment Signature on server
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount, description } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'J61PkpPzNvE2QJNXet5bKG6D';
    const body = (razorpay_order_id || '') + '|' + (razorpay_payment_id || '');

    if (razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

      const isAuthentic = expectedSignature === razorpay_signature;
      if (!isAuthentic) {
        return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
      }
    }

    // Save transaction to DB
    if (userId && amount) {
      const numAmount = parseFloat(amount);
      await db.query(
        'INSERT INTO wallet_transactions (user_id, type, amount, payment_id, description) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'topup', numAmount, razorpay_payment_id || `pay_${Date.now()}`, description || 'Vibe Wallet Top-Up via Razorpay']
      );
      await db.query('UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, userId]);
      await db.query('UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, userId]);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully!',
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
});

/**
 * POST /api/wallet/checkout/process
 * Handles: 100% Wallet Payment, 100% Razorpay Payment, or Split Payment
 */
router.post('/checkout/process', async (req, res) => {
  const client = await db.connect();
  try {
    const { userId, totalAmount, useWallet, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!userId || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid userId and totalAmount required' });
    }

    const numTotal = parseFloat(totalAmount);

    await client.query('BEGIN');

    // Fetch user wallet balance with ROW LOCK
    let currentBalance = 0;
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const role = userRes.rows[0].role;
      if (role === 'driver') {
        const dRes = await client.query('SELECT wallet_balance FROM driver_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
        currentBalance = parseFloat(dRes.rows[0]?.wallet_balance || 0);
      } else if (role === 'guide') {
        const gRes = await client.query('SELECT wallet_balance FROM guide_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
        currentBalance = parseFloat(gRes.rows[0]?.wallet_balance || 0);
      } else {
        const txSum = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN type = 'topup' OR type = 'refund' THEN amount WHEN type = 'withdrawal' OR type = 'debit' THEN -amount ELSE 0 END), 0) AS total FROM wallet_transactions WHERE user_id = $1",
          [userId]
        );
        currentBalance = parseFloat(txSum.rows[0]?.total || 0);
      }
    }

    let walletDeduction = 0;
    let razorpayRequired = numTotal;

    if (useWallet && currentBalance > 0) {
      if (currentBalance >= numTotal) {
        walletDeduction = numTotal;
        razorpayRequired = 0;
      } else {
        walletDeduction = currentBalance;
        razorpayRequired = numTotal - currentBalance;
      }
    }

    // Verify Razorpay Portion if remaining amount > 0
    if (razorpayRequired > 0) {
      if (!razorpayPaymentId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Remaining ₹${razorpayRequired} requires Razorpay payment completion.` });
      }

      if (razorpaySignature && razorpayOrderId) {
        const secret = process.env.RAZORPAY_KEY_SECRET || 'J61PkpPzNvE2QJNXet5bKG6D';
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedSig !== razorpaySignature) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
        }
      }
    }

    // Deduct Wallet Balance if used
    if (walletDeduction > 0) {
      await client.query(
        'INSERT INTO wallet_transactions (user_id, type, amount, payment_id, description) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'debit', walletDeduction, razorpayPaymentId || `wallet_pay_${Date.now()}`, `Order Split Payment (Wallet ₹${walletDeduction}, Razorpay ₹${razorpayRequired})`]
      );
      await client.query('UPDATE driver_profiles SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE user_id = $2', [walletDeduction, userId]);
      await client.query('UPDATE guide_profiles SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE user_id = $2', [walletDeduction, userId]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Checkout completed successfully!',
      paidViaWallet: walletDeduction,
      paidViaRazorpay: razorpayRequired,
      paymentId: razorpayPaymentId || `wallet_pay_${Date.now()}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in checkout process:', error);
    res.status(500).json({ success: false, message: 'Checkout process failed', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/topup
 * Add money to wallet fallback endpoint
 */
router.post('/topup', async (req, res) => {
  try {
    const { userId, amount, paymentId, description = 'Wallet Top-Up via Razorpay' } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid userId and positive amount required' });
    }

    const numAmount = parseFloat(amount);

    // Record transaction
    await db.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, payment_id, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'topup', numAmount, paymentId || `pay_${Date.now()}`, description]
    );

    // Update driver or guide wallet if applicable
    await db.query('UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, userId]);
    await db.query('UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, userId]);

    res.json({ success: true, message: `₹${numAmount} successfully added to wallet` });
  } catch (error) {
    console.error('Error in wallet topup:', error);
    res.status(500).json({ success: false, message: 'Top-up failed', error: error.message });
  }
});

/**
 * POST /api/wallet/withdraw
 * Submit withdrawal request for Driver / Guide / Tourist
 */
router.post('/withdraw', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { userId, userName = 'Partner', role = 'driver', amount, upiId, accountNumber, ifscCode } = req.body;

    if (!userId || !amount || amount <= 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'UserId and valid withdrawal amount required' });
    }

    const numAmount = parseFloat(amount);

    await client.query('BEGIN');

    // Record withdrawal request
    const wRes = await client.query(
      `INSERT INTO withdrawals (user_id, user_name, role, amount, upi_id, account_number, ifsc_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING *`,
      [userId, userName, role, numAmount, upiId || null, accountNumber || null, ifscCode || null]
    );

    // Record transaction log
    await client.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [userId, 'withdrawal', numAmount, `Withdrawal Request to ${upiId || accountNumber || 'Bank'} (Pending Approval)`]
    );

    // Deduct immediately from profile balance
    if (role === 'driver') {
      await client.query(
        'UPDATE driver_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2',
        [numAmount, userId]
      );
    } else if (role === 'guide') {
      await client.query(
        'UPDATE guide_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2',
        [numAmount, userId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully! Admin will process payout shortly.',
      withdrawal: wRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in withdrawal request:', error);
    res.status(500).json({ success: false, message: 'Withdrawal submission failed', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/trip-payment
 * Automatic Wallet Deduction on Booking/Payment of a Trip
 */
router.post('/trip-payment', async (req, res) => {
  try {
    const { userId, amount, tripId, description = 'Trip Payment' } = req.body;

    if (!userId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid userId and positive amount required' });
    }

    const numAmount = parseFloat(amount);

    // 1. Fetch user role & wallet balance
    const userRes = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const role = userRes.rows[0].role;
    let balance = 0;

    if (role === 'driver') {
      const dRes = await db.query('SELECT wallet_balance FROM driver_profiles WHERE user_id = $1', [userId]);
      balance = parseFloat(dRes.rows[0]?.wallet_balance || 0);
    } else if (role === 'guide') {
      const gRes = await db.query('SELECT wallet_balance FROM guide_profiles WHERE user_id = $1', [userId]);
      balance = parseFloat(gRes.rows[0]?.wallet_balance || 0);
    } else {
      // Tourist dynamic balance
      const txSum = await db.query(
        "SELECT COALESCE(SUM(CASE WHEN LOWER(type) = 'topup' OR LOWER(type) = 'refund' THEN amount WHEN LOWER(type) = 'withdrawal' OR LOWER(type) = 'debit' THEN -amount ELSE 0 END), 0) AS total FROM wallet_transactions WHERE user_id = $1",
        [userId]
      );
      balance = parseFloat(txSum.rows[0]?.total || 0);
    }

    // 2. Insufficient balance check
    if (balance < numAmount) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: `Insufficient wallet balance. Available: ₹${balance}. Required: ₹${numAmount}. Please top up first.`,
        balance
      });
    }

    // 3. Perform automatic deduction / log debit transaction
    await db.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, trip_id, description) 
       VALUES ($1, 'debit', $2, $3, $4)`,
      [userId, numAmount, tripId || null, description]
    );

    if (role === 'driver') {
      await db.query('UPDATE driver_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2', [numAmount, userId]);
    } else if (role === 'guide') {
      await db.query('UPDATE guide_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2', [numAmount, userId]);
    }

    res.json({
      success: true,
      message: 'Payment deducted from wallet successfully!',
      deductedAmount: numAmount,
      remainingBalance: balance - numAmount
    });
  } catch (error) {
    console.error('Error in trip-payment deduction:', error);
    res.status(500).json({ success: false, message: 'Trip payment deduction failed', error: error.message });
  }
});

/**
 * GET /api/admin/payment-settings
 * Fetch static Admin QR Code & UPI ID for wallet top-ups
 */
router.get('/admin/payment-settings', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_payment_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upi_id VARCHAR(100) NOT NULL DEFAULT 'vibe.pay@upi',
        qr_code_url TEXT NOT NULL DEFAULT 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform',
        updated_by UUID,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await db.query('SELECT * FROM admin_payment_settings ORDER BY updated_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      const initRes = await db.query(`
        INSERT INTO admin_payment_settings (upi_id, qr_code_url)
        VALUES ('vibe.pay@upi', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform')
        RETURNING *
      `);
      return res.json({ success: true, data: initRes.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching admin payment settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment settings' });
  }
});

/**
 * POST /api/admin/payment-settings
 * Update static Admin QR Code & UPI ID for wallet top-ups
 */
router.post('/admin/payment-settings', async (req, res) => {
  try {
    const { upi_id, qr_code_url, updated_by } = req.body;

    if (!upi_id || !qr_code_url) {
      return res.status(400).json({ success: false, message: 'UPI ID and QR Code URL are required.' });
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_payment_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upi_id VARCHAR(100) NOT NULL DEFAULT 'vibe.pay@upi',
        qr_code_url TEXT NOT NULL DEFAULT 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform',
        updated_by UUID,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await db.query('SELECT * FROM admin_payment_settings ORDER BY updated_at DESC LIMIT 1');

    let query;
    let params;

    if (result.rows.length === 0) {
      query = `
        INSERT INTO admin_payment_settings (upi_id, qr_code_url, updated_by, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      params = [upi_id, qr_code_url, updated_by || null];
    } else {
      const existingId = result.rows[0].id;
      query = `
        UPDATE admin_payment_settings
        SET upi_id = $1, qr_code_url = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      params = [upi_id, qr_code_url, updated_by || null, existingId];
    }

    const saveRes = await db.query(query, params);
    res.json({ success: true, message: 'Payment settings updated successfully', data: saveRes.rows[0] });
  } catch (error) {
    console.error('Error updating admin payment settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment settings', error: error.message });
  }
});

/**
 * POST /api/wallet/admin/adjust-balance
 * Manually update wallet balance for a user (tourist, driver, guide)
 */
router.post('/admin/adjust-balance', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { userId, amount, description = 'Manual wallet balance update by Admin' } = req.body;

    if (!userId || amount === undefined || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, message: 'userId and valid amount are required.' });
    }

    const numAmount = parseFloat(amount);
    const type = numAmount >= 0 ? 'topup' : 'withdrawal';

    // Verify user role
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const actualRole = userRes.rows[0].role;

    // Begin transaction
    await client.query('BEGIN');

    // 1. Insert into wallet_transactions
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description) 
       VALUES ($1, $2, $3, $4)`,
      [userId, type, Math.abs(numAmount), description]
    );

    // 2. If driver or guide, update their wallet_balance in the profile table
    if (actualRole === 'driver') {
      await client.query(
        'UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
        [numAmount, userId]
      );
    } else if (actualRole === 'guide') {
      await client.query(
        'UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
        [numAmount, userId]
      );
    }

    await client.query('COMMIT');

    // 3. Notify user
    try {
      await db.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, $2, '💼 Wallet Balance Adjusted', $3, CURRENT_TIMESTAMP)`,
        [userId, actualRole, `Your wallet balance was updated by the Admin. Adjustment: ₹${numAmount}. Description: ${description}`]
      );
    } catch (nErr) {
      console.warn('Failed to notify user about wallet adjustment:', nErr);
    }

    res.json({ success: true, message: `Successfully adjusted wallet balance by ₹${numAmount}` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting wallet balance:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust wallet balance', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/topup-request
 * Submit Wallet Top-Up Request with 5-minute timer & screenshot proof
 */
router.post('/topup-request', async (req, res) => {
  try {
    const { userId, userName = 'Partner', role = 'tourist', amount, screenshotUrl, initiatedAt } = req.body;

    if (!userId || !amount || parseFloat(amount) < 500) {
      return res.status(400).json({
        success: false,
        code: 'MINIMUM_AMOUNT_REQUIRED',
        message: 'Minimum top-up amount is ₹500.',
      });
    }

    if (!screenshotUrl) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot proof is required.',
      });
    }

    const requestedAt = initiatedAt ? new Date(initiatedAt) : new Date();
    const expiresAt = new Date(requestedAt.getTime() + 5 * 60 * 1000); // 5-minute window

    const now = new Date();
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        code: 'TOPUP_EXPIRED',
        message: 'Your top-up session expired. Please submit the payment screenshot within 5 minutes of initiating the transaction.',
      });
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS wallet_topup_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        role VARCHAR(20) DEFAULT 'tourist',
        amount NUMERIC(10,2) NOT NULL,
        screenshot_url TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending',
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        reviewed_by UUID,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reject_reason TEXT
      );
    `);

    const result = await db.query(
      `INSERT INTO wallet_topup_requests (
        user_id, user_name, role, amount, screenshot_url, status, requested_at, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7)
       RETURNING *`,
      [userId, userName, role, parseFloat(amount), screenshotUrl, requestedAt, expiresAt]
    );

    const topupReq = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Top-up request submitted successfully! Admin will verify and credit your wallet.',
      data: topupReq,
    });
  } catch (error) {
    console.error('Error submitting top-up request:', error);
    res.status(500).json({ success: false, message: 'Failed to submit top-up request' });
  }
});

/**
 * GET /api/admin/wallet/topup-requests
 * Admin Queue for pending top-up requests
 */
router.get('/admin/topup-requests', async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;

    const result = await db.query(
      `SELECT * FROM wallet_topup_requests WHERE status = $1 ORDER BY requested_at DESC`,
      [status]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching admin topup requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch topup requests' });
  }
});

/**
 * POST /api/admin/wallet/topup-requests/:id/approve
 * Admin approves top-up request & credits user wallet_balance
 */
router.post('/admin/topup-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const reqRes = await db.query('SELECT * FROM wallet_topup_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Top-up request not found' });
    }

    const topup = reqRes.rows[0];
    if (topup.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request is already ${topup.status}` });
    }

    const numAmount = parseFloat(topup.amount);

    // 1. Update top-up request status
    await db.query(
      `UPDATE wallet_topup_requests SET status = 'Approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [adminId || null, id]
    );

    // 2. Record wallet transaction
    await db.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'TOPUP', $2, $3)`,
      [topup.user_id, numAmount, `Admin Approved Wallet Top-Up (₹${numAmount})`]
    );

    // 3. Credit wallet balance
    await db.query('UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, topup.user_id]);
    await db.query('UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2', [numAmount, topup.user_id]);

    // 4. Notify user & emit real-time wallet update over socket
    await logWalletNotification(
      topup.user_id,
      topup.role || 'tourist',
      '🎉 Wallet Top-Up Approved!',
      `₹${numAmount} credited to your wallet balance.`
    );

    res.json({ success: true, message: `Successfully approved top-up of ₹${numAmount}` });
  } catch (error) {
    console.error('Error approving topup request:', error);
    res.status(500).json({ success: false, message: 'Failed to approve top-up request' });
  }
});

/**
 * POST /api/admin/wallet/topup-requests/:id/reject
 * Admin rejects top-up request
 */
router.post('/admin/topup-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason = 'Invalid payment proof', adminId } = req.body;

    const reqRes = await db.query('SELECT * FROM wallet_topup_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Top-up request not found' });
    }

    const topup = reqRes.rows[0];

    await db.query(
      `UPDATE wallet_topup_requests SET status = 'Rejected', reject_reason = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [rejectReason, adminId || null, id]
    );

    // Notify user & emit real-time wallet update over socket
    await logWalletNotification(
      topup.user_id,
      topup.role || 'tourist',
      '❌ Wallet Top-Up Rejected',
      `Reason: ${rejectReason}`
    );

    res.json({ success: true, message: 'Top-up request rejected' });
  } catch (error) {
    console.error('Error rejecting topup request:', error);
    res.status(500).json({ success: false, message: 'Failed to reject top-up request' });
  }
});

/**
 * GET /api/admin/platform-fee-revenue
 * Fetch platform fee earnings, breakdown by Guide vs Driver
 */
router.get('/admin/platform-fee-revenue', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_fee_revenue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          user_name VARCHAR(255),
          user_role VARCHAR(50) NOT NULL,
          trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
          amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await db.query(
      `SELECT * FROM platform_fee_revenue ORDER BY created_at DESC LIMIT 100`
    );

    const records = result.rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name || 'Partner',
      user_role: r.user_role || 'guide',
      trip_id: r.trip_id,
      amount: parseFloat(r.amount || 0),
      description: r.description,
      created_at: r.created_at,
    }));

    const totalRevenue = records.reduce((acc, curr) => acc + curr.amount, 0);
    const guideRevenue = records.filter(r => r.user_role === 'guide').reduce((acc, curr) => acc + curr.amount, 0);
    const driverRevenue = records.filter(r => r.user_role === 'driver').reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        guideRevenue,
        driverRevenue,
        records,
      }
    });
  } catch (error) {
    console.error('Error fetching platform fee revenue:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform fee revenue' });
  }
});

/**
 * GET /api/admin/wallet/reconciliation
 * Full Wallet Reconciliation Ledger Audit for Admin Panel
 */
router.get('/admin/reconciliation', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT wt.*, u.name AS user_name, u.role AS user_role 
       FROM wallet_transactions wt
       LEFT JOIN users u ON wt.user_id = u.id
       ORDER BY wt.created_at DESC LIMIT 100`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching wallet reconciliation ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reconciliation ledger' });
  }
});

/**
 * GET /api/wallet/admin/withdrawals
 * Admin view to get withdrawals list by status
 */
router.get('/admin/withdrawals', async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;
    const result = await db.query(
      'SELECT * FROM withdrawals WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
});

/**
 * GET /api/admin/users/:userId/wallet-history
 * GET /api/wallet/admin/users/:userId/wallet-history
 * Fetch full paginated & filterable wallet history for a specific user
 */
router.get('/admin/users/:userId/wallet-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '20', 10));
    const typeFilter = (req.query.type || 'all').toLowerCase();
    const searchQuery = (req.query.search || '').trim();

    const offset = (page - 1) * limit;

    // Find user profile by ID or phone number
    const userRes = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.status,
              COALESCE(d.wallet_balance, g.wallet_balance, 0.00) AS wallet_balance
       FROM users u
       LEFT JOIN driver_profiles d ON u.id = d.user_id
       LEFT JOIN guide_profiles g ON u.id = g.user_id
       WHERE u.id = $1 OR u.phone = $1 OR d.id = $1 OR g.id = $1`,
      [userId]
    );

    const userInfo = userRes.rows.length > 0 ? userRes.rows[0] : {
      id: userId,
      name: 'User',
      phone: userId,
      email: '',
      role: 'user',
      status: 'Active',
      wallet_balance: 0,
    };

    const actualUserId = userInfo.id || userId;

    // Build SQL query conditions dynamically
    let whereClause = 'WHERE (wt.user_id = $1 OR wt.user_id = $2)';
    const params = [userId, actualUserId];

    if (typeFilter !== 'all') {
      params.push(`%${typeFilter}%`);
      whereClause += ` AND LOWER(wt.type) LIKE $${params.length}`;
    }

    if (searchQuery) {
      params.push(`%${searchQuery.toLowerCase()}%`);
      whereClause += ` AND (LOWER(wt.description) LIKE $${params.length} OR LOWER(COALESCE(wt.payment_id, '')) LIKE $${params.length} OR CAST(wt.id AS TEXT) LIKE $${params.length})`;
    }

    // Get total count for pagination metadata
    const countResult = await db.query(
      `SELECT COUNT(*) FROM wallet_transactions wt ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get paginated transaction list
    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT 
        wt.id,
        wt.user_id,
        wt.type,
        wt.amount,
        COALESCE(wt.payment_id, wt.trip_id::text, 'N/A') AS payment_id,
        wt.description,
        wt.created_at,
        CASE 
          WHEN LOWER(wt.type) IN ('withdrawal', 'debit', 'platform_fee') THEN 'Debit'
          ELSE 'Credit'
        END AS transaction_direction,
        'Completed' AS status
      FROM wallet_transactions wt
      ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const txResult = await db.query(dataQuery, dataParams);

    res.json({
      success: true,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        phone: userInfo.phone,
        email: userInfo.email,
        role: userInfo.role,
        status: userInfo.status,
        walletBalance: parseFloat(userInfo.wallet_balance || 0),
      },
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
      transactions: txResult.rows.map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        type: tx.type,
        direction: tx.transaction_direction,
        amount: parseFloat(tx.amount),
        paymentId: tx.payment_id,
        description: tx.description || 'Wallet Transaction',
        status: tx.status,
        createdAt: tx.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching admin user wallet history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet history', error: error.message });
  }
});

/**
 * POST /api/wallet/admin/withdrawals/:id/approve
 * Admin approves withdrawal request
 */
router.post('/admin/withdrawals/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const wRes = await db.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    if (wRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    const withdrawal = wRes.rows[0];
    if (withdrawal.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request is already ${withdrawal.status}` });
    }

    await db.query(
      "UPDATE withdrawals SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Notify user
    try {
      await db.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, $2, '🎉 Withdrawal Approved', $3, CURRENT_TIMESTAMP)`,
        [withdrawal.user_id, withdrawal.role, `Your withdrawal of ₹${withdrawal.amount} has been approved and sent to your UPI ID: ${withdrawal.upi_id || 'bank account'}.`]
      );
    } catch (nErr) {
      console.warn('Failed to notify user about withdrawal approval:', nErr);
    }

    res.json({ success: true, message: 'Withdrawal approved successfully' });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ success: false, message: 'Failed to approve withdrawal' });
  }
});

/**
 * POST /api/wallet/admin/withdrawals/:id/reject
 * Admin rejects withdrawal request (reverts/refunds balance)
 */
router.post('/admin/withdrawals/:id/reject', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { rejectReason = 'Rejected by Admin', adminId } = req.body;

    await client.query('BEGIN');

    const wRes = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [id]);
    if (wRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    const withdrawal = wRes.rows[0];
    if (withdrawal.status !== 'Pending') {
      client.release();
      return res.status(400).json({ success: false, message: `Request is already ${withdrawal.status}` });
    }

    // 1. Update status
    await client.query(
      "UPDATE withdrawals SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // 2. Refund balance
    const numAmount = parseFloat(withdrawal.amount);
    await client.query(
      "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'refund', $2, $3)",
      [withdrawal.user_id, numAmount, `Reversal of Rejected Withdrawal: ${rejectReason}`]
    );

    if (withdrawal.role === 'driver') {
      await client.query(
        'UPDATE driver_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
        [numAmount, withdrawal.user_id]
      );
    } else if (withdrawal.role === 'guide') {
      await client.query(
        'UPDATE guide_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
        [numAmount, withdrawal.user_id]
      );
    }

    await client.query('COMMIT');

    // 3. Notify user
    try {
      await db.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, $2, '❌ Withdrawal Rejected', $3, CURRENT_TIMESTAMP)`,
        [withdrawal.user_id, withdrawal.role, `Your withdrawal of ₹${withdrawal.amount} was rejected. Reason: ${rejectReason}`]
      );
    } catch (nErr) {
      console.warn('Failed to notify user about withdrawal rejection:', nErr);
    }

    res.json({ success: true, message: 'Withdrawal rejected and balance refunded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/deduction-request
 * Submit Wallet Deduction/Payment Request by Customer
 */
router.post('/deduction-request', async (req, res) => {
  try {
    const { userId, userName = 'Customer', role = 'tourist', amount, description, screenshotUrl } = req.body;

    if (!userId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid userId and positive deduction amount required.',
      });
    }

    const result = await db.query(
      `INSERT INTO wallet_deduction_requests (
        user_id, user_name, role, amount, description, screenshot_url, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING *`,
      [userId, userName, role, parseFloat(amount), description || null, screenshotUrl || null]
    );

    const deductionReq = result.rows[0];

    // Log notification for Admin Queue
    try {
      await db.query(
        `INSERT INTO activity_notifications (user_id, role, title, body, created_at)
         VALUES ($1, 'admin', '📉 New Wallet Deduction Request!', $2, CURRENT_TIMESTAMP)`,
        [userId, `${userName} requested ₹${amount} wallet deduction/payment. Reason: ${description || 'None'}`]
      );
    } catch (nErr) {
      console.warn('Failed to insert admin notification:', nErr);
    }

    res.status(201).json({
      success: true,
      message: 'Deduction request submitted successfully! Admin will verify and process the wallet update.',
      data: deductionReq,
    });
  } catch (error) {
    console.error('Error submitting deduction request:', error);
    res.status(500).json({ success: false, message: 'Failed to submit deduction request', error: error.message });
  }
});

/**
 * GET /api/wallet/admin/deduction-requests
 * Admin Queue for pending/approved/rejected deduction requests with full driver details
 */
router.get('/admin/deduction-requests', async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;

    // Ensure table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS wallet_deduction_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          user_name VARCHAR(255),
          role VARCHAR(20) DEFAULT 'driver',
          amount NUMERIC(10,2) NOT NULL,
          description TEXT,
          screenshot_url TEXT,
          status VARCHAR(20) DEFAULT 'Pending',
          trip_id VARCHAR(255),
          requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          reviewed_by VARCHAR(255),
          reviewed_at TIMESTAMP WITH TIME ZONE,
          reject_reason TEXT
        );
      `);
    } catch (e) {}

    const result = await db.query(
      `SELECT 
         wdr.*,
         COALESCE(u.name, wdr.user_name, 'Driver Partner') AS user_name,
         COALESCE(u.phone, dp.phone, '') AS user_phone,
         COALESCE(u.email, '') AS user_email,
         COALESCE(dp.wallet_balance, gp.wallet_balance, 0) AS current_wallet_balance,
         dp.vehicle_number,
         dp.vehicle_model,
         COALESCE(t.title, t.drop_name, wdr.description, 'Ride Booking') AS trip_title,
         t.pickup_name,
         t.drop_name
       FROM wallet_deduction_requests wdr
       LEFT JOIN users u ON (CAST(wdr.user_id AS VARCHAR) = CAST(u.id AS VARCHAR))
       LEFT JOIN driver_profiles dp ON (CAST(wdr.user_id AS VARCHAR) = CAST(dp.user_id AS VARCHAR) OR CAST(wdr.user_id AS VARCHAR) = CAST(dp.id AS VARCHAR))
       LEFT JOIN guide_profiles gp ON (CAST(wdr.user_id AS VARCHAR) = CAST(gp.user_id AS VARCHAR) OR CAST(wdr.user_id AS VARCHAR) = CAST(gp.id AS VARCHAR))
       LEFT JOIN trips t ON (CAST(wdr.trip_id AS VARCHAR) = CAST(t.id AS VARCHAR))
       WHERE ($1 = 'All' OR $1 = 'all' OR LOWER(wdr.status) = LOWER($1))
       ORDER BY wdr.requested_at DESC`,
      [status]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching admin deduction requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch deduction requests', error: error.message });
  }
});

/**
 * POST /api/wallet/admin/deduction-requests/:id/approve
 * Admin approves deduction request & deducts platform fee from driver wallet_balance in real-time
 */
router.post('/admin/deduction-requests/:id/approve', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    await client.query('BEGIN');

    const reqRes = await client.query('SELECT * FROM wallet_deduction_requests WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text FOR UPDATE', [String(id)]);
    if (reqRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Deduction request not found' });
    }

    const deduction = reqRes.rows[0];
    if (deduction.status !== 'Pending') {
      client.release();
      return res.status(400).json({ success: false, message: `Request is already ${deduction.status}` });
    }

    const numAmount = parseFloat(deduction.amount);
    const role = deduction.role || 'driver';
    const userIdStr = String(deduction.user_id);

    // 1. Update deduction request status
    await client.query(
      `UPDATE wallet_deduction_requests SET status = 'Approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP WHERE id::text = $2::text OR CAST(id AS VARCHAR) = $2::text`,
      [adminId || null, String(id)]
    );

    // 2. Record wallet transaction safely
    try {
      const validUserUuid = toValidUuidOrNull(userIdStr);
      if (validUserUuid) {
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, description, trip_id) VALUES ($1, 'debit', $2, $3, $4)`,
          [validUserUuid, numAmount, `Platform Fee Deducted: ${deduction.description || 'Booking Platform Fee'}`, toValidUuidOrNull(deduction.trip_id) || null]
        );
      }
    } catch (txErr) {
      console.warn('Wallet transaction logging warning:', txErr.message);
    }

    // 3. Deduct from driver / guide balance
    let newBalance = 0;
    if (role === 'guide') {
      const gUp = await client.query(
        'UPDATE guide_profiles SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE user_id::text = $2::text OR CAST(user_id AS VARCHAR) = $2::text OR id::text = $2::text RETURNING wallet_balance',
        [numAmount, userIdStr]
      );
      if (gUp.rows.length > 0) newBalance = parseFloat(gUp.rows[0].wallet_balance);
    } else {
      const dUp = await client.query(
        'UPDATE driver_profiles SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE user_id::text = $2::text OR CAST(user_id AS VARCHAR) = $2::text OR id::text = $2::text RETURNING wallet_balance',
        [numAmount, userIdStr]
      );
      if (dUp.rows.length > 0) newBalance = parseFloat(dUp.rows[0].wallet_balance);
    }

    // 4. Record in platform_fee_revenue table for admin accounting
    try {
      await client.query(
        `INSERT INTO platform_fee_revenue (user_id, user_name, user_role, trip_id, amount, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [toValidUuidOrNull(userIdStr), deduction.user_name || 'Driver', role, toValidUuidOrNull(deduction.trip_id), numAmount]
      );
    } catch (revErr) {
      console.warn('Platform fee revenue recording error:', revErr.message);
    }

    await client.query('COMMIT');

    // 5. Notify user & emit real-time wallet update over socket
    try {
      await logWalletNotification(
        userIdStr,
        role,
        '📉 Platform Fee Deducted',
        `₹${numAmount} platform fee has been deducted from your wallet for booking ${deduction.trip_id ? `#${deduction.trip_id}` : ''}. Updated Balance: ₹${newBalance}`
      );
    } catch (nErr) {}

    try {
      emitWalletUpdate({
        userId: userIdStr,
        role: role,
        type: 'debit',
        amount: numAmount,
        balance: newBalance,
        description: `Platform Fee Deduction: ₹${numAmount}`,
      });
    } catch (sErr) {}

    console.log(`[Platform Fee] ✅ Admin approved ₹${numAmount} deduction for ${deduction.user_name} (${userIdStr}). New balance: ₹${newBalance}`);

    res.json({
      success: true,
      message: `Successfully approved and processed deduction of ₹${numAmount}`,
      balance: newBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving deduction request:', error);
    res.status(500).json({ success: false, message: 'Failed to approve deduction request', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/admin/deduction-requests/:id/reject
 * Admin rejects deduction request
 */
router.post('/admin/deduction-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason = 'Invalid deduction request', adminId } = req.body;

    const reqRes = await db.query('SELECT * FROM wallet_deduction_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Deduction request not found' });
    }

    const deduction = reqRes.rows[0];

    await db.query(
      `UPDATE wallet_deduction_requests SET status = 'Rejected', reject_reason = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [rejectReason, adminId || null, id]
    );

    // Notify user
    try {
      await logWalletNotification(
        deduction.user_id,
        deduction.role || 'driver',
        '❌ Platform Fee Deduction Rejected',
        `Platform fee deduction of ₹${deduction.amount} was rejected by Admin. Reason: ${rejectReason}`
      );
    } catch (nErr) {
      console.warn('Failed to notify user:', nErr);
    }

    res.json({ success: true, message: 'Deduction request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting deduction request:', error);
    res.status(500).json({ success: false, message: 'Failed to reject deduction request', error: error.message });
  }
});

module.exports = router;
