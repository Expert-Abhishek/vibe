import { DeviceEventEmitter } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, notifyWalletChanged } from '@/constants/api';
import { notificationStore } from '../store/notificationStore';

let socket: Socket | null = null;
let currentUserId: string | null = null;
let currentRole: string = 'tourist';

/**
 * Initialize Socket.io connection to backend API server
 */
export function initSocketService(userId?: string, role: string = 'tourist'): Socket | null {
  try {
    if (socket && socket.connected) {
      if (userId && (userId !== currentUserId || role !== currentRole)) {
        joinUserRoom(userId, role);
      }
      return socket;
    }

    currentUserId = userId || null;
    currentRole = role;

    socket = io(API_BASE_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log(`[SocketService] Connected to server: ${socket?.id}`);
      if (currentUserId || currentRole) {
        joinUserRoom(currentUserId || undefined, currentRole);
      }
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`[SocketService] Disconnected from server: ${reason}`);
    });

    socket.on('connect_error', (error: Error) => {
      if (socket && !socket.connected) {
        if (String(error?.message || '').includes('404') || String(error || '').includes('404')) {
          console.log('[SocketService] Endpoint unreachable (404). Socket polling paused.');
          socket.disconnect();
        }
      }
    });

    // 1. Real-time notification push events from backend
    socket.off('notification:new');
    socket.on('notification:new', (data: any) => {
      console.log('[SocketService] Received real-time push notification:', data);
      if (data) {
        notificationStore.addNotification(data);
        if (data.trip || data.tripId) {
          try {
            DeviceEventEmitter.emit('new_driver_request', data.trip || data);
            DeviceEventEmitter.emit('trip_request', data.trip || data);
          } catch (e) {}
        }
      }
    });

    // 2. Real-time wallet update handshake event from backend
    socket.off('wallet:updated');
    socket.on('wallet:updated', (data: any) => {
      console.log('[SocketService] Received real-time wallet update handshake:', data);
      notifyWalletChanged();
    });

    // 3. Real-time trip request broadcast event
    socket.off('trip_request');
    socket.on('trip_request', (data: any) => {
      console.log('[SocketService] Received real-time trip request via WebSockets:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('new_driver_request', data);
          DeviceEventEmitter.emit('trip_request', data);
        } catch (e) {}
      }
    });

    // 4. Real-time trip acceptance & decline events
    socket.off('trip_status_updated');
    socket.on('trip_status_updated', (data: any) => {
      console.log('[SocketService] 📢 Received real-time trip_status_updated event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_status_updated', data);
          if (data.status === 'Accepted') {
            DeviceEventEmitter.emit('trip_accepted', data);
            DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
          } else if (data.status === 'Declined') {
            DeviceEventEmitter.emit('trip_declined', data);
            DeviceEventEmitter.emit('RIDE_DECLINED', data);
          } else if (data.status === 'CANCELLED' || data.status === 'Cancelled') {
            DeviceEventEmitter.emit('trip_cancelled', data);
            DeviceEventEmitter.emit('RIDE_CANCELLED', data);
          }
        } catch (e) {}
      }
    });

    socket.off('trip_accepted');
    socket.on('trip_accepted', (data: any) => {
      console.log('[SocketService] 🚀 Received real-time trip_accepted event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_accepted', data);
          DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
        } catch (e) {}
      }
    });

    socket.off('RIDE_ACCEPTED');
    socket.on('RIDE_ACCEPTED', (data: any) => {
      console.log('[SocketService] 🚀 Received real-time RIDE_ACCEPTED event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_accepted', data);
          DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
        } catch (e) {}
      }
    });

    socket.off('trip_declined');
    socket.on('trip_declined', (data: any) => {
      console.log('[SocketService] 🛑 Received real-time trip_declined event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_declined', data);
          DeviceEventEmitter.emit('RIDE_DECLINED', data);
        } catch (e) {}
      }
    });

    socket.off('RIDE_DECLINED');
    socket.on('RIDE_DECLINED', (data: any) => {
      console.log('[SocketService] 🛑 Received real-time RIDE_DECLINED event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_declined', data);
          DeviceEventEmitter.emit('RIDE_DECLINED', data);
        } catch (e) {}
      }
    });

    // 5. Real-time GPS location stream listener
    socket.off('driver_location_stream');
    socket.on('driver_location_stream', (data: any) => {
      if (data) {
        try {
          DeviceEventEmitter.emit('driver_location_stream', data);
          DeviceEventEmitter.emit('driver_location_update', data);
        } catch (e) {}
      }
    });

    socket.off('driver_location_update');
    socket.on('driver_location_update', (data: any) => {
      if (data) {
        try {
          DeviceEventEmitter.emit('driver_location_stream', data);
          DeviceEventEmitter.emit('driver_location_update', data);
        } catch (e) {}
      }
    });

    return socket;
  } catch (err) {
    console.warn('[SocketService] Failed to initialize socket connection:', err);
    return null;
  }
}

/**
 * Join a specific trip room for real-time location streaming & status updates
 */
export function joinTripRoom(tripId: string, role: string = 'tourist', userId?: string) {
  if (socket && socket.connected) {
    socket.emit('join_room', { tripId: String(tripId), role, userId: userId || null });
    console.log(`[SocketService] 🟢 Joined trip room: trip:${tripId} (role: ${role})`);
  } else {
    initSocketService(userId, role);
    setTimeout(() => {
      if (socket && socket.connected) {
        socket.emit('join_room', { tripId: String(tripId), role, userId: userId || null });
        console.log(`[SocketService] 🟢 Joined trip room on delayed connect: trip:${tripId}`);
      }
    }, 1000);
  }
}

/**
 * Emit real-time trip request to backend WebSocket server
 */
export function emitTripRequestSocket(tripObject: any) {
  if (socket && socket.connected) {
    socket.emit('broadcast_trip_request', tripObject);
    console.log('[SocketService] Emitted broadcast_trip_request over WebSockets:', tripObject?.id);
  }
}

/**
 * Join client user/role room for targeted real-time push notifications & wallet updates
 */
export function joinUserRoom(userId?: string, role: string = 'tourist') {
  currentUserId = userId || null;
  currentRole = role;

  if (socket && socket.connected) {
    socket.emit('join_room', { userId: userId || null, role });
    console.log(`[SocketService] Emitted join_room for user:${userId || 'guest'} role:${role}`);
  }
}

/**
 * Emit real-time ride acceptance event to backend WebSocket server
 */
export function emitAcceptRideSocket(tripData: any) {
  if (socket && socket.connected) {
    socket.emit('accept_ride', tripData);
    console.log('[SocketService] Emitted accept_ride over WebSockets:', tripData?.id || tripData?.tripId);
  }
}

/**
 * Emit real-time driver GPS location update to backend WebSocket server
 */
export function emitDriverLocationSocket(locationData: { driverId: string; tripId?: string; latitude: number; longitude: number; heading?: number; speed?: number }) {
  if (socket && socket.connected) {
    socket.emit('driver_location_update', locationData);
  }
}

/**
 * Get Socket.io instance
 */
export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocketService() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

