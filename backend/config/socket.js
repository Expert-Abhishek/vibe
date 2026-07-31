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

    // Client registers its user & role rooms
    socket.on('join_room', (data) => {
      const { userId, role } = data || {};
      if (userId) {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${userRoom}`);
      }
      if (role) {
        const roleRoom = `role:${role}`;
        socket.join(roleRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${roleRoom}`);
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
    io.to(`user:${userId}`).emit('notification:new', notificationItem);
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
    io.to(`user:${userId}`).emit('wallet:updated', walletPayload);
    console.log(`[Socket.io] Emitted wallet:updated to user:${userId}`);
  }
  if (role) {
    io.to(`role:${role}`).emit('wallet:updated', walletPayload);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitWalletUpdate,
};
