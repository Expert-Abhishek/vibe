const express = require('express');
const db = require('../config/db');

const router = express.Router();

function parseSqlArray(val, fallback = []) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val.length > 0 ? val : fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      } catch (e) {}
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const arr = trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^"/, '').replace(/"$/, '')).filter(Boolean);
      if (arr.length > 0) return arr;
    }
    if (trimmed) return [trimmed];
  }
  return fallback;
}

const DEFAULT_CHECKPOINT_IMAGES = [
  'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?w=600',
  'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=600',
];

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
      const imgs = parseSqlArray(row.destination_images, DEFAULT_CHECKPOINT_IMAGES);
      const vids = parseSqlArray(row.destination_videos, []);
      checkpointsByPlan[row.plan_id].push({
        planDestinationId: row.plan_checkpoint_id,
        destinationId: row.destination_id,
        destination_id: row.destination_id,
        id: row.destination_id,
        name: row.destination_name,
        checkpoint_name: row.destination_name,
        location: row.destination_location || '',
        description: row.destination_description || '',
        images: imgs,
        image: imgs[0] || null,
        videos: vids,
        latitude: row.destination_latitude ? parseFloat(row.destination_latitude) : 15.335000,
        longitude: row.destination_longitude ? parseFloat(row.destination_longitude) : 76.460000,
        isMasterActive: row.master_destination_active,
        isActiveInPlan: row.plan_checkpoint_active,
        orderIndex: row.order_index
      });
    });


    const plans = plansRes.rows.map(p => {
      const basePrice = parseFloat(p.price || 0);
      const p5 = parseFloat(p.price_5_seater || 0) || basePrice;
      const p7 = parseFloat(p.price_7_seater || 0) || Math.round(basePrice * 1.35);
      const p4x4 = parseFloat(p.price_4x4 || 0) || Math.round(basePrice * 1.60);
      const pAuto = parseFloat(p.price_auto || 0) || Math.round(basePrice * 0.65);

      const allowedVehicles = p.allowed_vehicles
        ? (typeof p.allowed_vehicles === 'string' ? JSON.parse(p.allowed_vehicles) : p.allowed_vehicles)
        : { '5_seater': true, '7_seater': true, '4x4': true, 'auto': true };

      const planCps = checkpointsByPlan[p.id] || [];
      const planDestIds = planCps.map(cp => cp.destinationId).filter(Boolean);

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        km: parseFloat(p.km || 0),
        duration: p.duration,
        price: basePrice,
        price_5_seater: p5,
        price_7_seater: p7,
        price_4x4: p4x4,
        price_auto: pAuto,
        allowed_vehicles: allowedVehicles,
        isActive: p.is_active,
        checkpoints: planCps,
        destination_ids: planDestIds,
        destinationIds: planDestIds,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      };
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans', error: error.message });
  }
});

/**
 * POST /api/plans
 * Create a new Plan with selected Destination / Checkpoint IDs & Category Prices
 */
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      name,
      description = '',
      km = 0,
      duration = '1 Day',
      price = 0,
      price_5_seater = 0,
      price_7_seater = 0,
      price_4x4 = 0,
      price_auto = 0,
      allowed_vehicles = { '5_seater': true, '7_seater': true, '4x4': true, 'auto': true },
      destinationIds = [],
      isActive = true
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    await client.query('BEGIN');

    const baseP = parseFloat(price || 0);
    const p5 = parseFloat(price_5_seater || 0) || baseP;
    const p7 = parseFloat(price_7_seater || 0) || Math.round(baseP * 1.35);
    const p4x4 = parseFloat(price_4x4 || 0) || Math.round(baseP * 1.60);
    const pAuto = parseFloat(price_auto || 0) || Math.round(baseP * 0.65);

    const allowedVehiclesJson = typeof allowed_vehicles === 'string' ? allowed_vehicles : JSON.stringify(allowed_vehicles);

    const insertPlanRes = await client.query(
      `INSERT INTO plans (name, description, km, duration, price, price_5_seater, price_7_seater, price_4x4, price_auto, is_active, allowed_vehicles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       RETURNING *`,
      [name.trim(), description, parseFloat(km), duration.trim(), baseP, p5, p7, p4x4, pAuto, isActive, allowedVehiclesJson]
    );

    const newPlan = insertPlanRes.rows[0];

    // Insert destination checkpoints into plan_checkpoints
    if (Array.isArray(destinationIds) && destinationIds.length > 0) {
      for (let i = 0; i < destinationIds.length; i++) {
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

    await client.query('COMMIT');

    const retAllowed = newPlan.allowed_vehicles
      ? (typeof newPlan.allowed_vehicles === 'string' ? JSON.parse(newPlan.allowed_vehicles) : newPlan.allowed_vehicles)
      : allowed_vehicles;

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
        price_5_seater: parseFloat(newPlan.price_5_seater || 0),
        price_7_seater: parseFloat(newPlan.price_7_seater || 0),
        price_4x4: parseFloat(newPlan.price_4x4 || 0),
        price_auto: parseFloat(newPlan.price_auto || 0),
        allowed_vehicles: retAllowed,
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
 * Update plan details & Category Prices
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, km, duration, price, price_5_seater, price_7_seater, price_4x4, price_auto, allowed_vehicles, isActive } = req.body;

    const allowedVehiclesJson = allowed_vehicles ? (typeof allowed_vehicles === 'string' ? allowed_vehicles : JSON.stringify(allowed_vehicles)) : null;

    const result = await db.query(
      `UPDATE plans
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           km = COALESCE($3, km),
           duration = COALESCE($4, duration),
           price = COALESCE($5, price),
           price_5_seater = COALESCE($6, price_5_seater),
           price_7_seater = COALESCE($7, price_7_seater),
           price_4x4 = COALESCE($8, price_4x4),
           price_auto = COALESCE($9, price_auto),
           is_active = COALESCE($10, is_active),
           allowed_vehicles = COALESCE($11::jsonb, allowed_vehicles),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [name, description, km, duration, price, price_5_seater, price_7_seater, price_4x4, price_auto, isActive, allowedVehiclesJson, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const p = result.rows[0];
    const retAllowed = p.allowed_vehicles
      ? (typeof p.allowed_vehicles === 'string' ? JSON.parse(p.allowed_vehicles) : p.allowed_vehicles)
      : { '5_seater': true, '7_seater': true, '4x4': true, 'auto': true };

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
        price_5_seater: parseFloat(p.price_5_seater || 0),
        price_7_seater: parseFloat(p.price_7_seater || 0),
        price_4x4: parseFloat(p.price_4x4 || 0),
        price_auto: parseFloat(p.price_auto || 0),
        allowed_vehicles: retAllowed,
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
