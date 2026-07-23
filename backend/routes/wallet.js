const express = require('express');
const db = require('../config/db');

const router = express.Router();

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
      // Tourist wallet (stored in wallet_transactions sum or default)
      const txSum = await db.query(
        "SELECT COALESCE(SUM(CASE WHEN type = 'topup' OR type = 'refund' THEN amount WHEN type = 'withdrawal' THEN -amount ELSE 0 END), 0) AS total FROM wallet_transactions WHERE user_id = $1",
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
 * POST /api/wallet/topup
 * Add money to wallet via Razorpay
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
  try {
    const { userId, userName = 'Partner', role = 'driver', amount, upiId, accountNumber, ifscCode } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'UserId and valid withdrawal amount required' });
    }

    const numAmount = parseFloat(amount);

    // Record withdrawal request
    const wRes = await db.query(
      `INSERT INTO withdrawals (user_id, user_name, role, amount, upi_id, account_number, ifsc_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING *`,
      [userId, userName, role, numAmount, upiId || null, accountNumber || null, ifscCode || null]
    );

    // Record transaction log
    await db.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [userId, 'withdrawal', numAmount, `Withdrawal Request to ${upiId || accountNumber || 'Bank'} (Pending Approval)`]
    );

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully! Admin will process payout shortly.',
      withdrawal: wRes.rows[0],
    });
  } catch (error) {
    console.error('Error in withdrawal request:', error);
    res.status(500).json({ success: false, message: 'Withdrawal submission failed', error: error.message });
  }
});

/**
 * GET /api/wallet/withdrawals (Admin endpoint)
 */
router.get('/admin/withdrawals', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM withdrawals ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
});

/**
 * PATCH /api/wallet/withdrawals/:id/status (Admin endpoint)
 */
router.patch('/admin/withdrawals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Approved', 'Rejected'

    const result = await db.query(
      'UPDATE withdrawals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ success: true, message: `Withdrawal ${status}`, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    res.status(500).json({ success: false, message: 'Failed to update withdrawal status' });
  }
});

module.exports = router;
