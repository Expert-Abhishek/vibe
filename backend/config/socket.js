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
      const { userId, role, vehicleType } = data || {};

      if (userId) {
        const userRoom = `user:${String(userId)}`;
        socket.join(userRoom); // Driver's personal socket room
        console.log(`[Socket.io] ✅ SUCCESS: Socket ${socket.id} joined personal room [${userRoom}]`);
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

/**
 * Emit trip request: Direct Targeted vs Role Broadcast
 */
function emitTripRequest(tripObject) {
  if (!io || !tripObject) return;

  // Extract & normalize Driver ID to String
  const rawDriverId = tripObject.selectedDriverId || tripObject.driverId || tripObject.driver_id || tripObject.assignedDriverId || tripObject.guideId || tripObject.assignedToId;
  const driverId = rawDriverId ? String(rawDriverId) : null;
  const vehicleType = tripObject.vehicleType || tripObject.vehicle;

  const normalizedTrip = {
    ...tripObject,
    id: tripObject.id || tripObject.tripId,
    driverId: driverId,
    driver_id: driverId,
    status: 'Pending',
    createdAt: tripObject.createdAt || new Date().toISOString(),
  };

  if (driverId) {
    // TARGETED DIRECT REQUEST: Emit STRICTLY to specific driver/guide room
    const targetRoom = `user:${driverId}`;
    io.to(targetRoom).emit('trip_request', normalizedTrip);
    console.log(`🎯 [DIRECT TARGETED REQUEST] Sent strictly to room: [${targetRoom}] for Trip ID: ${normalizedTrip.id}`);
  } else {
    // GENERAL BROADCAST
    if (vehicleType) {
      io.to(`role:${vehicleType}`).emit('trip_request', normalizedTrip);
    }
    io.to('role:driver').emit('trip_request', normalizedTrip);
    io.to('role:guide').emit('trip_request', normalizedTrip);
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

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitWalletUpdate,
  emitTripRequest,
  emitTripAccepted,
};
