const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * POST /api/v1/notifications/mark-read
 * Marks notifications as read in the database for the given user and/or role
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { userId, role = 'driver' } = req.body;

    await db.query(`
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
    `);

    let queryText = '';
    let queryParams = [];

    if (userId) {
      queryText = `
        UPDATE activity_notifications
        SET is_read = TRUE
        WHERE (user_id = $1 OR user_id IS NULL)
          AND (role = $2 OR role = 'all')
          AND is_read = FALSE
      `;
      queryParams = [userId, role];
    } else {
      queryText = `
        UPDATE activity_notifications
        SET is_read = TRUE
        WHERE (role = $1 OR role = 'all')
          AND is_read = FALSE
      `;
      queryParams = [role];
    }

    const result = await db.query(queryText, queryParams);

    res.json({
      success: true,
      message: 'Notifications marked as read successfully',
      rowCount: result.rowCount || 0,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message,
    });
  }
});

module.exports = router;
