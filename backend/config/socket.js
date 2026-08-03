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

      if (role) {
        const roleRoom = `role:${role}`;
        socket.join(roleRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined role room [${roleRoom}]`);
      } else {
        socket.join('role:driver');
      }

      if (cat) {
        const normCat = String(cat).toLowerCase().replace('5seater', '5_seater').replace('7seater', '7_seater');
        socket.join(`role:${normCat}`);
        socket.join(`role:${cat}`);
        console.log(`[Socket.io] Socket ${socket.id} joined targeted category rooms [role:${normCat}] & [role:${cat}]`);
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
      emitTripStatusUpdated(data, 'Accepted');
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

      console.log(`[Socket.io] 📍 Broadcast location stream for trip [trip:${tripId || 'global'}] lat:${latitude} lng:${longitude}`);

      if (tripId) {
        io.to(`trip:${String(tripId)}`).emit('driver_location_stream', payload);
        io.to(`trip:${String(tripId)}`).emit('driver_location_update', payload);
      }
      if (driverId) {
        io.to(`user:${String(driverId)}`).emit('driver_location_stream', payload);
        io.to(`user:${String(driverId)}`).emit('driver_location_update', payload);
      }
      io.to('role:tourist').emit('driver_location_stream', payload);
      io.to('role:tourist').emit('driver_location_update', payload);
      io.emit('driver_location_stream', payload);
      io.emit('driver_location_update', payload);
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
 * Emit trip request: Direct Targeted vs Vehicle Category Room vs Role Broadcast
 */
function emitTripRequest(tripObject) {
  if (!io || !tripObject) return;

  // Extract & normalize Driver ID to String
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

  const normalizedTrip = {
    ...tripObject,
    id: tripObject.id || tripObject.tripId,
    driverId: driverId,
    driver_id: driverId,
    vehicleCategory: vehicleCategory || '5_seater',
    vehicle_category: vehicleCategory || '5_seater',
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

  const normalizedCat = String(vehicleCategory || '5_seater').toLowerCase().replace('5seater', '5_seater').replace('7seater', '7_seater');

  // Multi-event emission helper for max compatibility
  const emitRequestToRoom = (roomName) => {
    if (!io) return;
    io.to(roomName).emit('trip_request', normalizedTrip);
    io.to(roomName).emit('trip_requested', normalizedTrip);
    io.to(roomName).emit('new_driver_request', normalizedTrip);
    io.to(roomName).emit('RIDE_REQUESTED', normalizedTrip);
    io.to(roomName).emit('notification:new', notificationPayload);
  };

  if (driverId) {
    // TARGETED DIRECT REQUEST: Emit STRICTLY to specific driver/guide room
    const targetRoom = `user:${driverId}`;
    emitRequestToRoom(targetRoom);
    console.log(`🎯 [DIRECT TARGETED REQUEST] Sent strictly to room: [${targetRoom}] for Trip ID: ${normalizedTrip.id}`);
  } else {
    // TARGETED CATEGORY ROOM DISPATCH (e.g. role:5_seater, role:7_seater, role:4x4, role:auto)
    emitRequestToRoom(`role:${normalizedCat}`);
    emitRequestToRoom(`role:${vehicleCategory}`);
    emitRequestToRoom('role:driver');
    
    // Global socket broadcast fallback
    io.emit('trip_request', normalizedTrip);
    io.emit('trip_requested', normalizedTrip);
    io.emit('new_driver_request', normalizedTrip);
    console.log(`🎯 [CATEGORY DISPATCH] Emitted trip ${normalizedTrip.id} to rooms [role:${normalizedCat}] & [role:driver]`);
  }
}

/**
 * Emit real-time trip acceptance event to rider, driver, and global rooms
 */
// File: backend/config/socket.js

function emitTripAccepted(tripObject) {
  if (!io || !tripObject) return;

  // Normalize IDs & Extract Customer ID properly as clean strings
  const tripId = String(tripObject.id || tripObject.tripId || '');
  const customerId = String(tripObject.customer_id || tripObject.customerId || '');
  const driverId = String(tripObject.driver_id || tripObject.driverId || '');

  const acceptancePayload = {
    tripId: tripId,
    customerId: customerId,
    driverId: driverId,
    status: 'Accepted',
    driverName: tripObject.driverName || tripObject.driver_or_guide_name || 'Driver Partner',
    driverPhone: tripObject.driverPhone || '+91 99000 82400',
    vehicleModel: tripObject.vehicleModel || tripObject.vehicle_model || '5 Seater Cab',
    vehicleNumber: tripObject.vehicleNumber || tripObject.vehicle_number || 'HR-51-AB-1234',
    otp: tripObject.otp || '8240',
    endOtp: tripObject.endOtp || tripObject.end_otp || '4321',
  };

  console.log('[DEBUG] Driver accepted trip:', tripId, 'for Customer:', customerId);
  if (io && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms) {
    const userRoomSockets = io.sockets.adapter.rooms.get(`user:${customerId}`);
    const tripRoomSockets = io.sockets.adapter.rooms.get(`trip:${tripId}`);
    console.log('[DEBUG] Active Sockets in room user:' + customerId + ':', userRoomSockets ? Array.from(userRoomSockets) : 'EMPTY / NONE');
    console.log('[DEBUG] Active Sockets in room trip:' + tripId + ':', tripRoomSockets ? Array.from(tripRoomSockets) : 'EMPTY / NONE');
  }

  // 1. Emit to Rider's personal socket room (CRITICAL FIX: Ensure customerId is valid string)
  if (customerId && customerId !== 'null' && customerId !== 'undefined') {
    io.to(`user:${customerId}`).emit('trip_accepted', acceptancePayload);
    io.to(`user:${customerId}`).emit('trip_status_updated', acceptancePayload);
    console.log(`[SOCKET] Broadcasted trip_accepted to user:${customerId}`);
  }

  // 2. Emit to Trip room strictly using trip:ID format
  if (tripId && tripId !== 'null' && tripId !== 'undefined') {
    io.to(`trip:${tripId}`).emit('trip_accepted', acceptancePayload);
    io.to(`trip:${tripId}`).emit('trip_status_updated', acceptancePayload);
    console.log(`[SOCKET] Broadcasted trip_accepted to room trip:${tripId}`);
  }

  // 3. Global Broadcast Fallback
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

/**
 * Emit real-time trip cancellation event to rider, driver, and global rooms
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

  console.log(`[Socket.io] ❌ Emitting trip_cancelled & RIDE_CANCELLED for trip ${tripId}`);

  if (tripId) io.to(`trip:${tripId}`).emit('trip_cancelled', cancelPayload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_cancelled', cancelPayload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_cancelled', cancelPayload);

  io.to('role:driver').emit('trip_cancelled', cancelPayload);
  io.to('role:guide').emit('trip_cancelled', cancelPayload);
  io.to('role:tourist').emit('trip_cancelled', cancelPayload);
  io.emit('trip_cancelled', cancelPayload);
  io.emit('RIDE_CANCELLED', cancelPayload);
}

/**
 * Emit real-time trip completion event to rider, driver, and trip rooms
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

  console.log(`[Socket.io] 🏁 Emitting trip_completed to trip:${tripId} & user:${customerId}`);

  if (tripId) io.to(`trip:${tripId}`).emit('trip_completed', payload);
  if (customerId) io.to(`user:${customerId}`).emit('trip_completed', payload);
  if (driverId) io.to(`user:${driverId}`).emit('trip_completed', payload);

  io.to('role:driver').emit('trip_completed', payload);
  io.to('role:tourist').emit('trip_completed', payload);
  io.emit('trip_completed', payload);
}

/**
 * Emit unified 'trip_status_updated' event to specific rider room, trip room & globally
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
    vehicleModel: tripObject.vehicleModel || tripObject.vehicle_model || 'Innova / Thar 4x4',
    vehicleNumber: tripObject.vehicleNumber || tripObject.vehicle_number || 'KA-03-EX-8240',
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
    otp: tripObject.otp || '8240',
    endOtp: tripObject.endOtp || tripObject.end_otp || '4321',
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

  io.emit('trip_status_updated', payload);

  // Legacy helper calls for backward compatibility
  if (status === 'Accepted') emitTripAccepted(tripObject);
  else if (status === 'done' || status === 'Completed') emitTripCompleted(tripObject);
  else if (status === 'Declined') emitTripDeclined(tripObject);
  else if (status === 'CANCELLED' || status === 'Cancelled') emitTripCancelled(tripObject);
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
