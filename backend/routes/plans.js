const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/plans
 * Get all tour plans/packages with included checkpoints pulled from Destination Master
 */
router.get('/', async (req, res) => {
  try {
    const plansRes = await db.query('SELECT * FROM plans ORDER BY created_at DESC');

    const planCheckpointsQuery = `
      SELECT 
        pc.id AS plan_checkpoint_id,
        pc.plan_id,
        pc.checkpoint_id,
        pc.is_active AS plan_checkpoint_active,
        pc.order_index,
        c.name AS checkpoint_name,
        c.description AS checkpoint_description,
        c.images AS checkpoint_images,
        c.videos AS checkpoint_videos,
        c.is_active AS master_checkpoint_active,
        d.id AS destination_id,
        d.name AS destination_name
      FROM plan_checkpoints pc
      JOIN checkpoints c ON pc.checkpoint_id = c.id
      JOIN destinations d ON c.destination_id = d.id
      ORDER BY pc.order_index ASC, pc.created_at ASC
    `;

    const pcRes = await db.query(planCheckpointsQuery);

    // Group checkpoints by plan_id
    const checkpointsByPlan = {};
    pcRes.rows.forEach(row => {
      if (!checkpointsByPlan[row.plan_id]) {
        checkpointsByPlan[row.plan_id] = [];
      }
      checkpointsByPlan[row.plan_id].push({
        planCheckpointId: row.plan_checkpoint_id,
        checkpointId: row.checkpoint_id,
        destinationId: row.destination_id,
        destinationName: row.destination_name,
        name: row.checkpoint_name,
        description: row.checkpoint_description || '',
        images: Array.isArray(row.checkpoint_images) ? row.checkpoint_images : [],
        videos: Array.isArray(row.checkpoint_videos) ? row.checkpoint_videos : [],
        isMasterActive: row.master_checkpoint_active,
        isActiveInPlan: row.plan_checkpoint_active,
        orderIndex: row.order_index
      });
    });

    const plans = plansRes.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      km: parseFloat(p.km || 0),
      duration: p.duration,
      price: parseFloat(p.price || 0),
      isActive: p.is_active,
      checkpoints: checkpointsByPlan[p.id] || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans', error: error.message });
  }
});

/**
 * POST /api/plans
 * Create a new Plan with selected Checkpoint IDs
 */
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, description = '', km = 0, duration = '1 Day', price = 0, checkpointIds = [], isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    await client.query('BEGIN');

    const insertPlanRes = await client.query(
      `INSERT INTO plans (name, description, km, duration, price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), description, parseFloat(km), duration.trim(), parseFloat(price), isActive]
    );

    const newPlan = insertPlanRes.rows[0];

    // Insert checkpoints into plan_checkpoints
    if (Array.isArray(checkpointIds) && checkpointIds.length > 0) {
      for (let i = 0; i < checkpointIds.length; i++) {
        await client.query(
          `INSERT INTO plan_checkpoints (plan_id, checkpoint_id, order_index, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (plan_id, checkpoint_id) DO NOTHING`,
          [newPlan.id, checkpointIds[i], i]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Plan package created successfully',
      data: {
        id: newPlan.id,
        name: newPlan.name,
        description: newPlan.description || '',
        km: parseFloat(newPlan.km || 0),
        duration: newPlan.duration,
        price: parseFloat(newPlan.price || 0),
        isActive: newPlan.is_active,
        createdAt: newPlan.created_at,
        updatedAt: newPlan.updated_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating plan:', error);
    res.status(500).json({ success: false, message: 'Failed to create plan', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/plans/:id
 * Update plan details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, km, duration, price, isActive } = req.body;

    const result = await db.query(
      `UPDATE plans
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           km = COALESCE($3, km),
           duration = COALESCE($4, duration),
           price = COALESCE($5, price),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, description, km, duration, price, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const p = result.rows[0];
    res.json({
      success: true,
      message: 'Plan details updated successfully',
      data: {
        id: p.id,
        name: p.name,
        description: p.description || '',
        km: parseFloat(p.km || 0),
        duration: p.duration,
        price: parseFloat(p.price || 0),
        isActive: p.is_active,
        updatedAt: p.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ success: false, message: 'Failed to update plan', error: error.message });
  }
});

/**
 * PATCH /api/plans/:id/toggle
 * Toggle plan active status
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE plans
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: `Plan status toggled to ${result.rows[0].is_active ? 'Active' : 'Inactive'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling plan status:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle plan status', error: error.message });
  }
});

/**
 * DELETE /api/plans/:id
 * Delete plan
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM plans WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan deleted successfully', id });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ success: false, message: 'Failed to delete plan', error: error.message });
  }
});

// ==========================================
// PLAN CHECKPOINTS MANAGEMENT ENDPOINTS
// ==========================================

/**
 * POST /api/plans/:planId/checkpoints
 * Add a checkpoint from Master to Plan
 */
router.post('/:planId/checkpoints', async (req, res) => {
  try {
    const { planId } = req.params;
    const { checkpointId } = req.body;

    if (!checkpointId) {
      return res.status(400).json({ success: false, message: 'Checkpoint ID is required' });
    }

    const countRes = await db.query('SELECT COUNT(*) FROM plan_checkpoints WHERE plan_id = $1', [planId]);
    const nextOrder = parseInt(countRes.rows[0].count, 10);

    const result = await db.query(
      `INSERT INTO plan_checkpoints (plan_id, checkpoint_id, order_index, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (plan_id, checkpoint_id) DO UPDATE SET is_active = TRUE
       RETURNING *`,
      [planId, checkpointId, nextOrder]
    );

    res.status(201).json({
      success: true,
      message: 'Checkpoint added to plan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding checkpoint to plan:', error);
    res.status(500).json({ success: false, message: 'Failed to add checkpoint to plan', error: error.message });
  }
});

/**
 * PATCH /api/plans/:planId/checkpoints/:checkpointId/toggle
 * Toggle checkpoint active status inside plan
 */
router.patch('/:planId/checkpoints/:checkpointId/toggle', async (req, res) => {
  try {
    const { planId, checkpointId } = req.params;

    const result = await db.query(
      `UPDATE plan_checkpoints
       SET is_active = NOT is_active
       WHERE plan_id = $1 AND checkpoint_id = $2
       RETURNING *`,
      [planId, checkpointId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkpoint association not found in plan' });
    }

    res.json({
      success: true,
      message: `Plan checkpoint status toggled to ${result.rows[0].is_active ? 'Active' : 'Inactive'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling plan checkpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle plan checkpoint', error: error.message });
  }
});

/**
 * DELETE /api/plans/:planId/checkpoints/:checkpointId
 * Remove checkpoint from plan
 */
router.delete('/:planId/checkpoints/:checkpointId', async (req, res) => {
  try {
    const { planId, checkpointId } = req.params;

    const result = await db.query(
      'DELETE FROM plan_checkpoints WHERE plan_id = $1 AND checkpoint_id = $2 RETURNING id',
      [planId, checkpointId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkpoint association not found in plan' });
    }

    res.json({ success: true, message: 'Checkpoint removed from plan', checkpointId });
  } catch (error) {
    console.error('Error removing checkpoint from plan:', error);
    res.status(500).json({ success: false, message: 'Failed to remove checkpoint from plan', error: error.message });
  }
});

module.exports = router;
