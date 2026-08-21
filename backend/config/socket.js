const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.io server instance on the Node.js HTTP Server
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Driver/Guide room join listener
    socket.on('join_room', (data) => {
      const { userId, role, vehicleType, vehicleCategory, tripId, room } = data || {};
      const cat = vehicleCategory || vehicleType;

      if (room) {
        const customRoom = String(room);
        socket.join(customRoom);
        console.log(`[Socket.io] ✅ SUCCESS: Socket ${socket.id} joined custom room [${customRoom}]`);
      }

      if (userId) {
        const userRoom = `user:${String(userId)}`;
        socket.join(userRoom); // Driver/Rider personal socket room
        console.log(`[Socket.io] ✅ SUCCESS: Socket ${socket.id} joined personal room [${userRoom}]`);
      }

      if (tripId) {
        const idStr = String(tripId);
        const roomName = `trip:${idStr}`;
        socket.join(roomName);
        console.log(`[Socket.io] ✅ SUCCESS: Socket ${socket.id} joined trip room [${roomName}]`);
      }

      if (role === 'driver' || role === 'guide' || !role) {
        socket.join('role:driver');
        if (data?.isOnline !== false) {
          socket.join('role:driver_online');
          console.log(`[Socket.io] Socket ${socket.id} joined [role:driver_online]`);
        }
      }

      if (cat && data?.isOnline !== false) {
        const catStr = String(cat).toLowerCase().trim();
        const normCat = catStr.replace(/ /g, '_').replace(/-/g, '_').replace('5seater', '5_seater').replace('7seater', '7_seater').replace('4*4', '4x4').replace('4x4jeep', '4x4');
        socket.join(`role:${normCat}`);
        socket.join(`role:${catStr}`);
        if (normCat === '4x4') {
          socket.join('role:4x4jeep');
          socket.join('role:4*4');
        }
        console.log(`[Socket.io] Socket ${socket.id} joined targeted category rooms [role:${normCat}] & [role:${catStr}]`);
      }
    });

    // Toggle duty status handler
    socket.on('toggle_duty', (data) => {
      const { userId, isOnline, vehicleCategory, vehicleType } = data || {};
      const cat = vehicleCategory || vehicleType;
      if (isOnline) {
        socket.join('role:driver_online');
        socket.join('role:driver');
        if (cat) {
          const catStr = String(cat).toLowerCase().trim();
          const normCat = catStr.replace(/ /g, '_').replace(/-/g, '_').replace('5seater', '5_seater').replace('7seater', '7_seater').replace('4*4', '4x4').replace('4x4jeep', '4x4');
          socket.join(`role:${normCat}`);
          socket.join(`role:${catStr}`);
        }
        console.log(`[Socket.io] Driver ${userId || socket.id} TOGGLED DUTY ON (joined role:driver_online)`);
      } else {
        socket.leave('role:driver_online');
        socket.leave('role:driver');
        socket.leave('role:5_seater');
        socket.leave('role:7_seater');
        socket.leave('role:4x4');
        socket.leave('role:auto');
        socket.leave('role:4x4jeep');
        socket.leave('role:4*4');
        socket.leave('role:guide');
        console.log(`[Socket.io] Driver ${userId || socket.id} TOGGLED DUTY OFF (left role:driver_online & category rooms)`);
      }
    });

    // Explicit join_trip_room handler for client subscription
    socket.on('join_trip_room', (data) => {
      const tripId = typeof data === 'object' ? data?.tripId : data;
      if (tripId) {
        const roomName = `trip:${tripId}`;
        socket.join(roomName);
        console.log(`[SOCKET] Joined room: ${roomName}`);
      }
    });

    // Accept ride listener from driver app
    socket.on('accept_ride', (data) => {
      if (!data) return;
      console.log('[Socket.io] 🟢 Received accept_ride socket event from driver:', data);
      emitTripAccepted(data);
    });

    // Decline ride listener from driver app
    socket.on('decline_ride', (data) => {
      if (!data) return;
      console.log('[Socket.io] 🔴 Received decline_ride socket event from driver:', data);
      emitTripDeclined(data);
    });

    // Client relay broadcast fallback
    socket.on('broadcast_trip_request', (tripObject) => {
      if (!tripObject) return;
      emitTripRequest(tripObject);
    });

    // Real-time GPS Location Streaming listener from Driver App
    socket.on('driver_location_update', (locationData) => {
      if (!locationData) return;
      const { driverId, tripId, latitude, longitude, heading, speed } = locationData;

      if (!latitude || !longitude) return;

      const payload = {
        driverId: driverId ? String(driverId) : 'driver_unknown',
        tripId: tripId ? String(tripId) : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        heading: heading ? parseFloat(heading) : 0,
        speed: speed ? parseFloat(speed) : 0,
        timestamp: new Date().toISOString(),
      };

      if (tripId) {
        io.to(`trip:${String(tripId)}`).emit('driver_location_stream', payload);
        io.to(`trip:${String(tripId)}`).emit('driver_location_update', payload);
      }
      if (driverId) {
        io.to(`user:${String(driverId)}`).emit('driver_location_stream', payload);
        io.to(`user:${String(driverId)}`).emit('driver_location_update', payload);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.io instance
 */
function getIO() {
  if (!io) {
    console.warn('[Socket.io] io instance not initialized yet!');
  }
  return io;
}

/**
 * Emit a real-time notification to user and/or role rooms
 */
function emitNotification(payload) {
  if (!io) return;
  const { userId, role, title, body, tripId, id, createdAt } = payload || {};

  const notificationItem = {
    id: id || `notif_${Date.now()}`,
    title: title || 'New Alert',
    body: body || '',
    tripId: tripId || null,
    role: role || 'tourist',
    userId: userId || null,
    createdAt: createdAt || new Date().toISOString(),
    isRead: false,
  };

  // Broadcast to specific user room if userId exists
  if (userId) {
    io.to(`user:${String(userId)}`).emit('notification:new', notificationItem);
  } else if (role && role !== 'driver') {
    // Only broadcast to role room if not generic driver broadcast
    io.to(`role:${role}`).emit('notification:new', notificationItem);
  }
}

/**
 * Emit real-time wallet update handshake event to targeted client sockets
 */
function emitWalletUpdate(payload) {
  if (!io) return;
  const { userId, role, newBalance, amount, type, description } = payload || {};

  const walletPayload = {
    userId: userId || null,
    role: role || null,
    newBalance: newBalance !== undefined ? newBalance : null,
    amount: amount || 0,
    type: type || 'update',
    description: description || 'Wallet balance updated',
    timestamp: new Date().toISOString(),
  };

  if (userId) {
    io.to(`user:${String(userId)}`).emit('wallet:updated', walletPayload);
    console.log(`[Socket.io] Emitted wallet:updated to user:${String(userId)}`);
  }
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 14.5;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Emit trip request: Direct Targeted vs Vehicle Category Room
 */
function emitTripRequest(tripObject) {
  if (!io || !tripObject) return;

  const rawDriverId = tripObject.selectedDriverId || tripObject.driverId || tripObject.driver_id || tripObject.assignedDriverId || tripObject.guideId || tripObject.assignedToId;
  const driverId = rawDriverId ? String(rawDriverId) : null;
  const vehicleCategory = tripObject.vehicleCategory || tripObject.vehicle_category || tripObject.vehicleType || tripObject.vehicle;

  const computedDistance = tripObject.distanceKm || tripObject.distance_km || tripObject.distance || tripObject.dist ||
    calculateHaversineKm(
      parseFloat(tripObject.pickupLat || tripObject.pickup_lat),
      parseFloat(tripObject.pickupLng || tripObject.pickup_lng),
      parseFloat(tripObject.dropLat || tripObject.drop_lat),
      parseFloat(tripObject.dropLng || tripObject.drop_lng)
    );

  const rawCps = tripObject.checkpoints || tripObject.route || [];
  const parsedCps = Array.isArray(rawCps)
    ? rawCps.map(c => typeof c === 'object' && c !== null ? (c.name || c.checkpoint_name || c.title || c.location || String(c)) : String(c)).filter(Boolean)
    : [];

  const rawDestIds = tripObject.destination_ids || tripObject.destinationIds || [];
  const parsedDestIds = Array.isArray(rawDestIds)
    ? rawDestIds.map(d => typeof d === 'object' && d !== null ? String(d.id || d.destination_id || d.destinationId || d.name) : String(d)).filter(Boolean)
    : [];

  const normalizedTrip = {
    ...tripObject,
    id: tripObject.id || tripObject.tripId,
    driverId: driverId,
    driver_id: driverId,
    vehicleCategory: vehicleCategory || '5_seater',
    vehicle_category: vehicleCategory || '5_seater',
    distanceKm: computedDistance,
    distance_km: computedDistance,
    destination_ids: parsedDestIds.length > 0 ? parsedDestIds : (tripObject.destination_ids || tripObject.destinationIds || []),
    destinationIds: parsedDestIds.length > 0 ? parsedDestIds : (tripObject.destinationIds || tripObject.destination_ids || []),
    checkpoints: parsedCps.length > 0 ? parsedCps : (tripObject.checkpoints || []),
    status: 'Pending',
    createdAt: tripObject.createdAt || new Date().toISOString(),
  };

  const notificationPayload = {
    id: `notif_trip_${normalizedTrip.id}_${Date.now()}`,
    title: '🚖 New Ride Request!',
    body: `New ride request: ${normalizedTrip.pickupName || normalizedTrip.pickup || 'Pickup Point'} ➔ ${normalizedTrip.dropName || normalizedTrip.drop || normalizedTrip.title || 'Drop Location'} (₹${normalizedTrip.amount || normalizedTrip.price || 0})`,
    tripId: normalizedTrip.id,
    trip: normalizedTrip,
    role: 'driver',
    userId: driverId || null,
    createdAt: new Date().toISOString(),
  };

  const catStr = String(vehicleCategory || '5_seater').toLowerCase().trim();
  const normalizedCat = catStr.replace(/ /g, '_').replace(/-/g, '_').replace('5seater', '5_seater').replace('7seater', '7_seater').replace('4*4', '4x4').replace('4x4jeep', '4x4');

  const emitRequestToRoom = (roomName) => {
    if (!io) return;
    io.to(roomName).emit('trip_request', normalizedTrip);
    io.to(roomName).emit('trip_requested', normalizedTrip);
    io.to(roomName).emit('new_driver_request', normalizedTrip);
    io.to(roomName).emit('RIDE_REQUESTED', normalizedTrip);
    io.to(roomName).emit('notification:new', notificationPayload);
  };

  if (driverId) {
    // TARGETED DIRECT REQUEST: Emit STRICTLY to specific driver room
    const targetRoom = `user:${driverId}`;
    emitRequestToRoom(targetRoom);
    console.log(`🎯 [DIRECT TARGETED REQUEST] Sent strictly to room: [${targetRoom}] for Trip ID: ${normalizedTrip.id}`);
  } else {
    // TARGETED CATEGORY DISPATCH: ONLY emit to drivers registered for requested vehicle category!
    const targetRooms = new Set([`role:${normalizedCat}`, `role:${catStr}`]);
    if (normalizedCat === '4x4') {
      targetRooms.add('role:4x4jeep');
      targetRooms.add('role:4*4');
    }
    for (const roomName of targetRooms) {
      emitRequestToRoom(roomName);
    }
    console.log(`🎯 [CATEGORY DISPATCH] Emitted trip ${normalizedTrip.id} strictly to category rooms:`, Array.from(targetRooms));
  }
}

/**
 * Emit real-time trip acceptance event strictly to trip participants
 */
async function emitTripAccepted(tripObject) {
  if (!io || !tripObject) return;

  const tripId = String(tripObject.id || tripObject.tripId || '').trim();
  let customerId = String(tripObject.customer_id || tripObject.customerId || '').trim();
  let driverId = String(tripObject.driver_id || tripObject.driverId || '').trim();

  let driverName = tripObject.driverName || tripObject.driver_or_guide_name || null;
  let driverPhone = tripObject.driverPhone || tripObject.phone || null;
  let vehicleModel = tripObject.vehicleModel || tripObject.vehicle_model || null;
  let vehicleNumber = tripObject.vehicleNumber || tripObject.vehicle_number || null;

  if (tripId && tripId !== 'null' && tripId !== 'undefined') {
    try {
      const db = require('./db');
      const tRes = await db.query(
        `SELECT * FROM trips WHERE id::text = $1::text OR CAST(id AS VARCHAR) = $1::text`,
        [tripId]
      );
      if (tRes.rows && tRes.rows.length > 0) {
        const tRow = tRes.rows[0];
        if ((!customerId || customerId === 'null' || customerId === 'undefined') && tRow.customer_id) {
          customerId = String(tRow.customer_id).trim();
        }
        if (driverId && driverId !== 'null' && driverId !== 'undefined') {
          if (!tRow.driver_id || String(tRow.driver_id).trim() !== driverId || tRow.status !== 'Accepted') {
            await db.query(
              `UPDATE trips 
               SET status = 'Accepted', status_code = 1, driver_id = $1, driver_or_guide_name = $2 
               WHERE id::text = $3::text OR CAST(id AS VARCHAR) = $3::text`,
              [driverId, driverName || tRow.driver_or_guide_name || 'Driver Partner', tripId]
            );
          }
        } else if (tRow.driver_id) {
          driverId = String(tRow.driver_id).trim();
        }
        if (tRow.driver_or_guide_name) driverName = driverName || tRow.driver_or_guide_name;
      }
    } catch (dbErr) {
      console.warn('[SOCKET DB SYNC WARN]:', dbErr.message);
    }
  }

  if (driverId && driverId !== 'null' && driverId !== 'undefined') {
    try {
      const db = require('./db');
      const dRes = await db.query(
        `SELECT u.phone, u.name, d.vehicle_model, d.vehicle_number 
         FROM users u 
         LEFT JOIN driver_profiles d ON u.id::text = d.user_id::text 
         WHERE u.id::text = $1::text OR CAST(u.id AS VARCHAR) = $1::text`,
        [driverId]
      );
      if (dRes.rows && dRes.rows.length > 0) {
        const dRow = dRes.rows[0];
        if (dRow.name) driverName = dRow.name;
        if (dRow.phone) driverPhone = dRow.phone;
        if (dRow.vehicle_model) vehicleModel = dRow.vehicle_model;
        if (dRow.vehicle_number) vehicleNumber = dRow.vehicle_number;
      }
    } catch (e) {
      console.warn('[SOCKET] Could not query driver details for emitTripAccepted:', e.message);
    }
  }

  const acceptancePayload = {
    ...tripObject,
    id: tripId,
    tripId: tripId,
    customerId: customerId,
    customer_id: customerId,
    driverId: driverId,
    driver_id: driverId,
    status: 'Accepted',
    driverName: driverName || 'Driver Partner',
    driver_or_guide_name: driverName || 'Driver Partner',
    driverPhone: driverPhone || '',
    vehicleModel: vehicleModel || 'Cab',
    vehicleNumber: vehicleNumber || '',
    otp: tripObject.otp || tripObject.startOtp || null,
    endOtp: tripObject.endOtp || tripObject.end_otp || null,
  };

  // Emit strictly to trip participants
  if (customerId && customerId !== 'null' && customerId !== 'undefined') {
    io.to(`user:${customerId}`).emit('trip_accepted', acceptancePayload);
    io.to(`user:${customerId}`).emit('trip_status_updated', acceptancePayload);
  }
  if (driverId && driverId !== 'null' && driverId !== 'undefined') {
    io.to(`user:${driverId}`).emit('trip_accepted', acceptancePayload);
    io.to(`user:${driverId}`).emit('trip_status_updated', acceptancePayload);
  }
  if (tripId && tripId !== 'null' && tripId !== 'undefined') {
    io.to(`trip:${tripId}`).emit('trip_accepted', acceptancePayload);
    io.to(`trip:${tripId}`).emit('trip_status_updated', acceptancePayload);
  }
}

/**
 * Emit real-time trip decline event strictly to trip participants
 */
function emitTripDeclined(tripObject) {
  if (!io || !tripObject) return;
  const tripId = tripObject.id || tripObject.tripId;
  const customerId = tripObject.customerId || tripObject.customer_id;
  const driverId = tripObject.driverId || tripObject.driver_id;
  const driverName = tripObject.driverName || tripObject.driver_or_guide_name || 'Captain';

  const declinePayload = {
    ...tripObject,
    id: tripId,
    tripId: tripId,
    status: 'Declined',
    driverName: driverName,
    driver_or_guide_name: driverName,
    driverId: driverId,
    declinedAt: new Date().toISOString(),
  };

  if (tripId) io.to(`trip:${tripId}`).emit('trip_declined', declinePayload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_declined', declinePayload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_declined', declinePayload);
}

/**
 * Emit real-time trip cancellation event strictly to trip participants
 */
function emitTripCancelled(tripObject) {
  if (!io || !tripObject) return;
  const tripId = tripObject.id || tripObject.tripId;
  const customerId = tripObject.customerId || tripObject.customer_id;
  const driverId = tripObject.driverId || tripObject.driver_id;

  const cancelPayload = {
    ...tripObject,
    id: tripId,
    tripId: tripId,
    status: 'CANCELLED',
    cancelledAt: new Date().toISOString(),
  };

  if (tripId) io.to(`trip:${tripId}`).emit('trip_cancelled', cancelPayload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_cancelled', cancelPayload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_cancelled', cancelPayload);
}

/**
 * Emit real-time trip completion event strictly to trip participants
 */
function emitTripCompleted(tripObject) {
  if (!io || !tripObject) return;
  const tripId = String(tripObject.id || tripObject.tripId || '');
  const customerId = String(tripObject.customer_id || tripObject.customerId || '');
  const driverId = String(tripObject.driver_id || tripObject.driverId || '');
  const fare = parseFloat(tripObject.amount || tripObject.price || tripObject.fare || 0);

  const payload = {
    tripId: tripId,
    id: tripId,
    status: 'done',
    finalFare: fare,
    amount: fare,
    completedAt: new Date().toISOString(),
    customerId: customerId,
    driverId: driverId,
  };

  console.log(`[Socket.io] 🏁 Emitting trip_completed to trip:${tripId}, user:${customerId}, user:${driverId}`);

  if (tripId && tripId !== 'null' && tripId !== 'undefined') io.to(`trip:${tripId}`).emit('trip_completed', payload);
  if (customerId && customerId !== 'null' && customerId !== 'undefined') io.to(`user:${customerId}`).emit('trip_completed', payload);
  if (driverId && driverId !== 'null' && driverId !== 'undefined') io.to(`user:${driverId}`).emit('trip_completed', payload);
}

/**
 * Emit unified 'trip_status_updated' event strictly to trip participants
 */
function emitTripStatusUpdated(tripObject, statusOverride) {
  if (!io || !tripObject) return;

  const tripId = String(tripObject.id || tripObject.tripId || '');
  const customerId = String(tripObject.customer_id || tripObject.customerId || '');
  const driverId = String(tripObject.driver_id || tripObject.driverId || '');
  const status = statusOverride || tripObject.status || 'Accepted';

  const driverDetails = {
    id: driverId,
    name: tripObject.driverName || tripObject.driver_or_guide_name || 'Captain',
    phone: tripObject.driverPhone || '+91 99000 82400',
    vehicleModel: tripObject.vehicleModel || tripObject.vehicle_model || 'Cab',
    vehicleNumber: tripObject.vehicleNumber || tripObject.vehicle_number || '',
  };

  const payload = {
    tripId: tripId,
    id: tripId,
    customerId: customerId,
    driverId: driverId,
    status: status,
    driverDetails: driverDetails,
    driverName: driverDetails.name,
    driverPhone: driverDetails.phone,
    vehicleModel: driverDetails.vehicleModel,
    vehicleNumber: driverDetails.vehicleNumber,
    otp: tripObject.otp || tripObject.startOtp || null,
    endOtp: tripObject.endOtp || tripObject.end_otp || null,
    updatedAt: new Date().toISOString(),
  };

  const stLower = String(status).toLowerCase();
  const stagePayload = {
    ...payload,
    stage: stLower,
  };

  if (customerId && customerId !== 'null' && customerId !== 'undefined') {
    io.to(`user:${customerId}`).emit('trip_status_updated', payload);
    io.to(`user:${customerId}`).emit('trip_stage_update', stagePayload);
    if (stLower === 'accepted') {
      io.to(`user:${customerId}`).emit('trip_accepted', payload);
    } else if (stLower === 'done' || stLower === 'completed') {
      io.to(`user:${customerId}`).emit('trip_completed', payload);
    }
  }

  if (tripId && tripId !== 'null' && tripId !== 'undefined') {
    io.to(`trip:${tripId}`).emit('trip_status_updated', payload);
    io.to(`trip:${tripId}`).emit('trip_stage_update', stagePayload);
    if (stLower === 'accepted') {
      io.to(`trip:${tripId}`).emit('trip_accepted', payload);
    } else if (stLower === 'done' || stLower === 'completed') {
      io.to(`trip:${tripId}`).emit('trip_completed', payload);
    }
  }

  if (driverId && driverId !== 'null' && driverId !== 'undefined') {
    io.to(`user:${driverId}`).emit('trip_status_updated', payload);
    io.to(`user:${driverId}`).emit('trip_stage_update', stagePayload);
    if (stLower === 'done' || stLower === 'completed') {
      io.to(`user:${driverId}`).emit('trip_completed', payload);
    }
  }
}

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitWalletUpdate,
  emitTripRequest,
  emitTripAccepted,
  emitTripDeclined,
  emitTripCancelled,
  emitTripCompleted,
  emitTripStatusUpdated,
  emitTripStatusUpdate: emitTripStatusUpdated,
};
