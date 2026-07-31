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
      const { userId, role, vehicleType, tripId } = data || {};

      if (userId) {
        const userRoom = `user:${String(userId)}`;
        socket.join(userRoom); // Driver's personal socket room
        console.log(`[Socket.io] ✅ SUCCESS: Socket ${socket.id} joined personal room [${userRoom}]`);
      }

      if (tripId) {
        const tripRoom = `trip:${String(tripId)}`;
        socket.join(tripRoom); // Join specific trip tracking room
        console.log(`[Socket.io] Socket ${socket.id} joined trip room [${tripRoom}]`);
      }

      if (role) {
        const roleRoom = `role:${role}`;
        socket.join(roleRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined role room [${roleRoom}]`);
      }

      if (vehicleType) {
        const vehicleRoom = `role:${vehicleType}`;
        socket.join(vehicleRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined vehicle room [${vehicleRoom}]`);
      }
    });

    // Client relay broadcast fallback
    socket.on('broadcast_trip_request', (tripObject) => {
      if (!tripObject) return;
      emitTripRequest(tripObject);
    });

    // Real-time GPS Location Streaming listener from Driver App
    socket.on('driver_location_update', (locationData) => {
      if (!locationData) return;
      const { driverId, tripId, latitude, longitude, heading } = locationData;

      if (!latitude || !longitude) return;

      const payload = {
        driverId: String(driverId),
        tripId: tripId ? String(tripId) : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        heading: heading ? parseFloat(heading) : 0,
        timestamp: new Date().toISOString(),
      };

      if (tripId) {
        io.to(`trip:${String(tripId)}`).emit('driver_location_stream', payload);
      }
      if (driverId) {
        io.to(`driver:${String(driverId)}`).emit('driver_location_stream', payload);
      }
      io.to('role:tourist').emit('driver_location_stream', payload);
      io.emit('driver_location_stream', payload);
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
  }
  // Broadcast to specific role room
  if (role) {
    io.to(`role:${role}`).emit('notification:new', notificationItem);
  }
  // Broadcast to admin room if role is admin
  if (role === 'admin') {
    io.to('role:admin').emit('notification:new', notificationItem);
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
  if (role) {
    io.to(`role:${role}`).emit('wallet:updated', walletPayload);
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
 * Emit trip request: Direct Targeted vs Role Broadcast with notification:new fallback
 */
function emitTripRequest(tripObject) {
  if (!io || !tripObject) return;

  // Extract & normalize Driver ID to String
  const rawDriverId = tripObject.selectedDriverId || tripObject.driverId || tripObject.driver_id || tripObject.assignedDriverId || tripObject.guideId || tripObject.assignedToId;
  const driverId = rawDriverId ? String(rawDriverId) : null;
  const vehicleType = tripObject.vehicleType || tripObject.vehicle;

  const computedDistance = tripObject.distanceKm || tripObject.distance_km || tripObject.distance || tripObject.dist ||
    calculateHaversineKm(
      parseFloat(tripObject.pickupLat || tripObject.pickup_lat),
      parseFloat(tripObject.pickupLng || tripObject.pickup_lng),
      parseFloat(tripObject.dropLat || tripObject.drop_lat),
      parseFloat(tripObject.dropLng || tripObject.drop_lng)
    );

  const normalizedTrip = {
    ...tripObject,
    id: tripObject.id || tripObject.tripId,
    driverId: driverId,
    driver_id: driverId,
    distanceKm: computedDistance,
    distance_km: computedDistance,
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

  if (driverId) {
    // TARGETED DIRECT REQUEST: Emit STRICTLY to specific driver/guide room
    const targetRoom = `user:${driverId}`;
    io.to(targetRoom).emit('trip_request', normalizedTrip);
    io.to(targetRoom).emit('notification:new', notificationPayload);
    io.emit('trip_request', normalizedTrip);
    io.emit('notification:new', notificationPayload);
    console.log(`🎯 [DIRECT TARGETED REQUEST] Sent strictly to room: [${targetRoom}] for Trip ID: ${normalizedTrip.id}`);
  } else {
    // GENERAL BROADCAST
    if (vehicleType) {
      io.to(`role:${vehicleType}`).emit('trip_request', normalizedTrip);
      io.to(`role:${vehicleType}`).emit('notification:new', notificationPayload);
    }
    io.to('role:driver').emit('trip_request', normalizedTrip);
    io.to('role:driver').emit('notification:new', notificationPayload);
    io.to('role:guide').emit('trip_request', normalizedTrip);
    io.to('role:guide').emit('notification:new', notificationPayload);
    io.emit('trip_request', normalizedTrip);
    io.emit('notification:new', notificationPayload);
    console.log(`📢 [BROADCAST REQUEST] Emitted to all drivers/guides for Trip ID: ${normalizedTrip.id}`);
  }
}

/**
 * Emit real-time trip acceptance event to rider, driver, and global rooms
 */
function emitTripAccepted(tripObject) {
  if (!io || !tripObject) return;
  const tripId = tripObject.id || tripObject.tripId;
  const customerId = tripObject.customerId || tripObject.customer_id;
  const driverId = tripObject.driverId || tripObject.driver_id;
  const driverName = tripObject.driverName || tripObject.driver_or_guide_name || 'Captain';

  const acceptancePayload = {
    ...tripObject,
    id: tripId,
    tripId: tripId,
    status: 'Accepted',
    driverName: driverName,
    driver_or_guide_name: driverName,
    driverId: driverId,
    acceptedAt: new Date().toISOString(),
  };

  console.log(`[Socket.io] 🚀 Emitting trip_accepted & RIDE_ACCEPTED for trip ${tripId} by driver ${driverName} (${driverId})`);

  if (tripId) io.to(`trip:${tripId}`).emit('trip_accepted', acceptancePayload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_accepted', acceptancePayload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_accepted', acceptancePayload);

  io.to('role:driver').emit('trip_accepted', acceptancePayload);
  io.to('role:guide').emit('trip_accepted', acceptancePayload);
  io.to('role:tourist').emit('trip_accepted', acceptancePayload);
  io.emit('trip_accepted', acceptancePayload);
  io.emit('RIDE_ACCEPTED', acceptancePayload);
}

/**
 * Emit real-time trip decline/rejection event to rider and global rooms
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

  console.log(`[Socket.io] 🛑 Emitting trip_declined & RIDE_DECLINED for trip ${tripId} by driver ${driverName}`);

  if (tripId) io.to(`trip:${tripId}`).emit('trip_declined', declinePayload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_declined', declinePayload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_declined', declinePayload);

  io.to('role:driver').emit('trip_declined', declinePayload);
  io.to('role:guide').emit('trip_declined', declinePayload);
  io.to('role:tourist').emit('trip_declined', declinePayload);
  io.emit('trip_declined', declinePayload);
  io.emit('RIDE_DECLINED', declinePayload);
}

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitWalletUpdate,
  emitTripRequest,
  emitTripAccepted,
  emitTripDeclined,
};
