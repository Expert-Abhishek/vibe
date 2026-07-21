const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/plans
 * Get all tour plans with included checkpoints pulled from Destinations Master
 */
router.get('/', async (req, res) => {
  try {
    const plansRes = await db.query('SELECT * FROM plans ORDER BY created_at DESC');

    const planCheckpointsQuery = `
      SELECT 
        pc.id AS plan_checkpoint_id,
        pc.plan_id,
        COALESCE(pc.destination_id, pc.checkpoint_id) AS destination_id,
        pc.is_active AS plan_checkpoint_active,
        pc.order_index,
        d.name AS destination_name,
        d.location AS destination_location,
        d.description AS destination_description,
        d.images AS destination_images,
        d.videos AS destination_videos,
        d.latitude AS destination_latitude,
        d.longitude AS destination_longitude,
        d.is_active AS master_destination_active
      FROM plan_checkpoints pc
      JOIN destinations d ON COALESCE(pc.destination_id, pc.checkpoint_id) = d.id
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
        planDestinationId: row.plan_checkpoint_id,
        destinationId: row.destination_id,
        name: row.destination_name,
        location: row.destination_location || '',
        description: row.destination_description || '',
        images: Array.isArray(row.destination_images) ? row.destination_images : [],
        videos: Array.isArray(row.destination_videos) ? row.destination_videos : [],
        latitude: row.destination_latitude ? parseFloat(row.destination_latitude) : 15.335000,
        longitude: row.destination_longitude ? parseFloat(row.destination_longitude) : 76.460000,
        isMasterActive: row.master_destination_active,
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
 * Create a new Plan with selected Destination / Checkpoint IDs
 */
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, description = '', km = 0, duration = '1 Day', price = 0, destinationIds = [], isActive = true } = req.body;

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

    // Check if checkpoint_id column exists in plan_checkpoints table
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'plan_checkpoints' AND column_name = 'checkpoint_id'`
    );
    const hasCheckpointIdCol = colCheck.rows.length > 0;

    // Insert destination checkpoints into plan_checkpoints
    if (Array.isArray(destinationIds) && destinationIds.length > 0) {
      for (let i = 0; i < destinationIds.length; i++) {
        if (hasCheckpointIdCol) {
          await client.query(
            `INSERT INTO plan_checkpoints (plan_id, destination_id, checkpoint_id, order_index, is_active)
             SELECT $1, $2, $2, $3, TRUE
             WHERE NOT EXISTS (
               SELECT 1 FROM plan_checkpoints WHERE plan_id = $1 AND (destination_id = $2 OR checkpoint_id = $2)
             )`,
            [newPlan.id, destinationIds[i], i]
          );
        } else {
          await client.query(
            `INSERT INTO plan_checkpoints (plan_id, destination_id, order_index, is_active)
             SELECT $1, $2, $3, TRUE
             WHERE NOT EXISTS (
               SELECT 1 FROM plan_checkpoints WHERE plan_id = $1 AND destination_id = $2
             )`,
            [newPlan.id, destinationIds[i], i]
          );
        }
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
// PLAN DESTINATION CHECKPOINTS ENDPOINTS
// ==========================================

/**
 * POST /api/plans/:planId/destinations
 * Add a Destination / Checkpoint from Master to Plan
 */
router.post('/:planId/destinations', async (req, res) => {
  try {
    const { planId } = req.params;
    const { destinationId } = req.body;

    if (!destinationId) {
      return res.status(400).json({ success: false, message: 'Destination ID is required' });
    }

    const existingCp = await db.query(
      'SELECT id, is_active FROM plan_checkpoints WHERE plan_id = $1 AND destination_id = $2',
      [planId, destinationId]
    );

    let result;
    if (existingCp.rows.length > 0) {
      result = await db.query(
        'UPDATE plan_checkpoints SET is_active = TRUE WHERE plan_id = $1 AND destination_id = $2 RETURNING *',
        [planId, destinationId]
      );
    } else {
      const countRes = await db.query('SELECT COUNT(*) FROM plan_checkpoints WHERE plan_id = $1', [planId]);
      const nextOrder = parseInt(countRes.rows[0].count, 10);
      result = await db.query(
        `INSERT INTO plan_checkpoints (plan_id, destination_id, order_index, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING *`,
        [planId, destinationId, nextOrder]
      );
    }


    res.status(201).json({
      success: true,
      message: 'Destination checkpoint added to plan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding destination to plan:', error);
    res.status(500).json({ success: false, message: 'Failed to add destination to plan', error: error.message });
  }
});

/**
 * PATCH /api/plans/:planId/destinations/:destinationId/toggle
 * Toggle destination checkpoint active status inside plan
 */
router.patch('/:planId/destinations/:destinationId/toggle', async (req, res) => {
  try {
    const { planId, destinationId } = req.params;

    const result = await db.query(
      `UPDATE plan_checkpoints
       SET is_active = NOT is_active
       WHERE plan_id = $1 AND destination_id = $2
       RETURNING *`,
      [planId, destinationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination checkpoint association not found in plan' });
    }

    res.json({
      success: true,
      message: `Plan checkpoint status toggled to ${result.rows[0].is_active ? 'Active' : 'Inactive'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling plan checkpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle checkpoint in plan', error: error.message });
  }
});

/**
 * DELETE /api/plans/:planId/destinations/:destinationId
 * Remove destination checkpoint from plan
 */
router.delete('/:planId/destinations/:destinationId', async (req, res) => {
  try {
    const { planId, destinationId } = req.params;

    const result = await db.query(
      'DELETE FROM plan_checkpoints WHERE plan_id = $1 AND destination_id = $2 RETURNING id',
      [planId, destinationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination checkpoint association not found in plan' });
    }

    res.json({ success: true, message: 'Destination checkpoint removed from plan', destinationId });
  } catch (error) {
    console.error('Error removing destination checkpoint from plan:', error);
    res.status(500).json({ success: false, message: 'Failed to remove checkpoint from plan', error: error.message });
  }
});

module.exports = router;
