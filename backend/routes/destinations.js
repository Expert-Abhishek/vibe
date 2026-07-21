const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/destinations
 * List all destinations along with their master checkpoints.
 */
router.get('/', async (req, res) => {
  try {
    const destResult = await db.query(
      'SELECT * FROM destinations ORDER BY created_at DESC'
    );
    const cpResult = await db.query(
      'SELECT * FROM checkpoints ORDER BY order_index ASC, created_at ASC'
    );

    // Group checkpoints by destination_id
    const checkpointsByDest = {};
    cpResult.rows.forEach(cp => {
      if (!checkpointsByDest[cp.destination_id]) {
        checkpointsByDest[cp.destination_id] = [];
      }
      checkpointsByDest[cp.destination_id].push({
        id: cp.id,
        destinationId: cp.destination_id,
        name: cp.name,
        description: cp.description || '',
        images: Array.isArray(cp.images) ? cp.images : [],
        videos: Array.isArray(cp.videos) ? cp.videos : [],
        isActive: cp.is_active,
        orderIndex: cp.order_index,
        createdAt: cp.created_at,
        updatedAt: cp.updated_at
      });
    });

    const destinations = destResult.rows.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      location: d.location || '',
      imageUrl: d.image_url || '',
      isActive: d.is_active,
      checkpoints: checkpointsByDest[d.id] || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    res.json({ success: true, data: destinations });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch destinations', error: error.message });
  }
});

/**
 * POST /api/destinations
 * Add a new destination
 */
router.post('/', async (req, res) => {
  try {
    const { name, description = '', location = '', imageUrl = '', isActive = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Destination name is required' });
    }

    const result = await db.query(
      `INSERT INTO destinations (name, description, location, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), description, location, imageUrl, isActive]
    );

    const d = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Destination created successfully',
      data: {
        id: d.id,
        name: d.name,
        description: d.description || '',
        location: d.location || '',
        imageUrl: d.image_url || '',
        isActive: d.is_active,
        checkpoints: [],
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating destination:', error);
    res.status(500).json({ success: false, message: 'Failed to create destination', error: error.message });
  }
});

/**
 * PUT /api/destinations/:id
 * Update an existing destination
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, imageUrl, isActive } = req.body;

    const result = await db.query(
      `UPDATE destinations
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           image_url = COALESCE($4, image_url),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, location, imageUrl, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const d = result.rows[0];
    res.json({
      success: true,
      message: 'Destination updated successfully',
      data: {
        id: d.id,
        name: d.name,
        description: d.description || '',
        location: d.location || '',
        imageUrl: d.image_url || '',
        isActive: d.is_active,
        updatedAt: d.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ success: false, message: 'Failed to update destination', error: error.message });
  }
});

/**
 * PATCH /api/destinations/:id/toggle
 * Toggle destination active status
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE destinations
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    res.json({
      success: true,
      message: `Destination status toggled to ${result.rows[0].is_active ? 'Active' : 'Inactive'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling destination status:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle destination status', error: error.message });
  }
});

/**
 * DELETE /api/destinations/:id
 * Delete destination and associated checkpoints
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM destinations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    res.json({ success: true, message: 'Destination deleted successfully', id });
  } catch (error) {
    console.error('Error deleting destination:', error);
    res.status(500).json({ success: false, message: 'Failed to delete destination', error: error.message });
  }
});

// ==========================================
// CHECKPOINT ENDPOINTS (Destination Master)
// ==========================================

/**
 * POST /api/destinations/:destinationId/checkpoints
 * Add checkpoint to destination master
 */
router.post('/:destinationId/checkpoints', async (req, res) => {
  try {
    const { destinationId } = req.params;
    const { name, description = '', images = [], videos = [], isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Checkpoint name is required' });
    }

    const cleanImages = Array.isArray(images) ? images : [];
    const cleanVideos = Array.isArray(videos) ? videos : [];

    const result = await db.query(
      `INSERT INTO checkpoints (destination_id, name, description, images, videos, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [destinationId, name.trim(), description, cleanImages, cleanVideos, isActive]
    );

    const cp = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Checkpoint added to Destination Master',
      data: {
        id: cp.id,
        destinationId: cp.destination_id,
        name: cp.name,
        description: cp.description || '',
        images: cp.images || [],
        videos: cp.videos || [],
        isActive: cp.is_active,
        createdAt: cp.created_at,
        updatedAt: cp.updated_at
      }
    });
  } catch (error) {
    console.error('Error adding checkpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to add checkpoint', error: error.message });
  }
});

/**
 * PUT /api/destinations/checkpoints/:id
 * Update a checkpoint in Master
 */
router.put('/checkpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, images, videos, isActive } = req.body;

    const result = await db.query(
      `UPDATE checkpoints
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           images = COALESCE($3, images),
           videos = COALESCE($4, videos),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, images, videos, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    }

    const cp = result.rows[0];
    res.json({
      success: true,
      message: 'Checkpoint updated successfully',
      data: {
        id: cp.id,
        destinationId: cp.destination_id,
        name: cp.name,
        description: cp.description || '',
        images: cp.images || [],
        videos: cp.videos || [],
        isActive: cp.is_active,
        updatedAt: cp.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to update checkpoint', error: error.message });
  }
});

/**
 * PATCH /api/destinations/checkpoints/:id/toggle
 * Toggle checkpoint active status in Master
 */
router.patch('/checkpoints/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE checkpoints
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    }

    res.json({
      success: true,
      message: `Checkpoint status toggled to ${result.rows[0].is_active ? 'Active' : 'Inactive'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling checkpoint status:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle checkpoint status', error: error.message });
  }
});

/**
 * DELETE /api/destinations/checkpoints/:id
 * Delete checkpoint from Master
 */
router.delete('/checkpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM checkpoints WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    }

    res.json({ success: true, message: 'Checkpoint deleted from Master', id });
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    res.status(500).json({ success: false, message: 'Failed to delete checkpoint', error: error.message });
  }
});

module.exports = router;
