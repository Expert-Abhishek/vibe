const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * GET /api/destinations
 * Get all destinations / tourist places / checkpoints master
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM destinations ORDER BY created_at DESC'
    );

    const destinations = result.rows.map(d => ({
      id: d.id,
      name: d.name,
      location: d.location || '',
      description: d.description || '',
      images: Array.isArray(d.images) ? d.images : [],
      videos: Array.isArray(d.videos) ? d.videos : [],
      latitude: d.latitude ? parseFloat(d.latitude) : 15.335000,
      longitude: d.longitude ? parseFloat(d.longitude) : 76.460000,
      isActive: d.is_active,
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
 * Create a new destination / tourist place / checkpoint
 */
router.post('/', async (req, res) => {
  try {
    const { name, location = '', description = '', images = [], videos = [], latitude = 15.335000, longitude = 76.460000, isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Destination name is required' });
    }

    const cleanImages = Array.isArray(images) ? images : [];
    const cleanVideos = Array.isArray(videos) ? videos : [];

    const result = await db.query(
      `INSERT INTO destinations (name, location, description, images, videos, latitude, longitude, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name.trim(), location.trim(), description, cleanImages, cleanVideos, parseFloat(latitude), parseFloat(longitude), isActive]
    );

    const d = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Destination / Tourist place created successfully',
      data: {
        id: d.id,
        name: d.name,
        location: d.location || '',
        description: d.description || '',
        images: d.images || [],
        videos: d.videos || [],
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        isActive: d.is_active,
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
 * Update an existing destination / tourist place
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description, images, videos, latitude, longitude, isActive } = req.body;

    const result = await db.query(
      `UPDATE destinations
       SET name = COALESCE($1, name),
           location = COALESCE($2, location),
           description = COALESCE($3, description),
           images = COALESCE($4, images),
           videos = COALESCE($5, videos),
           latitude = COALESCE($6, latitude),
           longitude = COALESCE($7, longitude),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, location, description, images, videos, latitude, longitude, isActive, id]
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
        location: d.location || '',
        description: d.description || '',
        images: d.images || [],
        videos: d.videos || [],
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
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
 * Toggle active status (ON/OFF)
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
    res.status(500).json({ success: false, message: 'Failed to toggle status', error: error.message });
  }
});

/**
 * DELETE /api/destinations/:id
 * Delete destination
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

module.exports = router;
