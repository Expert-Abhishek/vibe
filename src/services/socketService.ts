import { API_BASE_URL, notifyWalletChanged } from '@/constants/api';
import { updateTripStatusGlobally } from '@/constants/tripSync';
import { DeviceEventEmitter } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { notificationStore } from '../store/notificationStore';
import { playNotificationChime } from '../utils/soundHelper';

let socket: Socket | null = null;
let currentUserId: string | null = null;
let currentRole: string = 'tourist';

import { getUserSessionSync } from '@/constants/authStore';

/**
 * Initialize Socket.io connection to backend API server
 */
export function initSocketService(userId?: string, role: string = 'tourist'): Socket | null {
  try {
    const session = getUserSessionSync();
    const effectiveUserId = userId || session?.id || undefined;
    const effectiveRole = role || session?.role || 'tourist';

    if (socket && socket.connected) {
      if (effectiveUserId && (effectiveUserId !== currentUserId || effectiveRole !== currentRole)) {
        joinUserRoom(effectiveUserId, effectiveRole);
      }
      return socket;
    }

    currentUserId = effectiveUserId || null;
    currentRole = effectiveRole;

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
      joinUserRoom(currentUserId || undefined, currentRole);
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
        } catch (e) { }
      }
    });
    // 4. Real-time trip status events (accepted, completed, cancelled, declined)
    socket.off('trip_status_updated');
    socket.on('trip_status_updated', (data: any) => {
      console.log('[SocketService] 📢 Received real-time trip_status_updated event:', data);
      if (data) {
        try {
          const tripId = String(data.tripId || data.id || '');
          const status = String(data.status || 'Accepted');
          updateTripStatusGlobally(tripId, status, data);

          DeviceEventEmitter.emit('trip_status_updated', data);
          const st = status.toLowerCase();
          if (st.includes('accepted')) {
            DeviceEventEmitter.emit('trip_accepted', data);
            DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
          } else if (st.includes('completed') || st.includes('finish') || st === 'done') {
            DeviceEventEmitter.emit('trip_completed', data);
            DeviceEventEmitter.emit('RIDE_COMPLETED', data);
          } else if (st.includes('declined')) {
            DeviceEventEmitter.emit('trip_declined', data);
            DeviceEventEmitter.emit('RIDE_DECLINED', data);
          } else if (st.includes('cancel')) {
            DeviceEventEmitter.emit('trip_cancelled', data);
            DeviceEventEmitter.emit('RIDE_CANCELLED', data);
          }
        } catch (e) { }
      }
    });

    socket.off('trip_completed');
    socket.on('trip_completed', (data: any) => {
      console.log('[SocketService] 🎉 Received real-time trip_completed event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_completed', data);
          DeviceEventEmitter.emit('RIDE_COMPLETED', data);
          DeviceEventEmitter.emit('trip_status_updated', { ...data, status: 'Completed' });
        } catch (e) { }
      }
    });

    socket.off('trip_cancelled');
    socket.on('trip_cancelled', (data: any) => {
      console.log('[SocketService] 🛑 Received real-time trip_cancelled event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_cancelled', data);
          DeviceEventEmitter.emit('RIDE_CANCELLED', data);
          DeviceEventEmitter.emit('trip_status_updated', { ...data, status: 'CANCELLED' });
        } catch (e) { }
      }
    });

    socket.off('trip_stage_update');
    socket.on('trip_stage_update', (data: any) => {
      console.log('[SocketService] 🔄 Received real-time trip_stage_update:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_stage_update', data);
          DeviceEventEmitter.emit('trip_status_updated', data);
          const st = String(data.stage || data.status || '').toLowerCase();
          if (st === 'completed' || st === 'done') {
            DeviceEventEmitter.emit('trip_completed', data);
          } else if (st === 'accepted') {
            DeviceEventEmitter.emit('trip_accepted', data);
            DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
          }
        } catch (e) { }
      }
    });

    socket.off('trip_accepted');
    socket.on('trip_accepted', (data: any) => {
      console.log('[SocketService] 🚀 Received real-time trip_accepted event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_accepted', data);
          DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
          DeviceEventEmitter.emit('trip_status_updated', { ...data, status: 'accepted' });
        } catch (e) { }
      }
    });

    socket.off('RIDE_ACCEPTED');
    socket.on('RIDE_ACCEPTED', (data: any) => {
      console.log('[SocketService] 🚀 Received real-time RIDE_ACCEPTED event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_accepted', data);
          DeviceEventEmitter.emit('RIDE_ACCEPTED', data);
        } catch (e) { }
      }
    });

    socket.off('trip_declined');
    socket.on('trip_declined', (data: any) => {
      console.log('[SocketService] 🛑 Received real-time trip_declined event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_declined', data);
          DeviceEventEmitter.emit('RIDE_DECLINED', data);
        } catch (e) { }
      }
    });

    socket.off('RIDE_DECLINED');
    socket.on('RIDE_DECLINED', (data: any) => {
      console.log('[SocketService] 🛑 Received real-time RIDE_DECLINED event:', data);
      if (data) {
        try {
          DeviceEventEmitter.emit('trip_declined', data);
          DeviceEventEmitter.emit('RIDE_DECLINED', data);
        } catch (e) { }
      }
    });

    // 5. Real-time GPS location stream listener
    socket.off('driver_location_stream');
    socket.on('driver_location_stream', (data: any) => {
      if (data) {
        try {
          DeviceEventEmitter.emit('driver_location_stream', data);
          DeviceEventEmitter.emit('driver_location_update', data);
        } catch (e) { }
      }
    });

    socket.off('driver_location_update');
    socket.on('driver_location_update', (data: any) => {
      if (data) {
        try {
          DeviceEventEmitter.emit('driver_location_stream', data);
          DeviceEventEmitter.emit('driver_location_update', data);
        } catch (e) { }
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
  const idStr = String(tripId);
  const roomName = `trip:${idStr}`;
  const payload = { tripId: idStr, role, userId: userId || null, room: roomName };

  if (socket && socket.connected) {
    socket.emit('join_room', payload);
    socket.emit('join_trip_room', { tripId: idStr, room: roomName });
    console.log(`[SocketService] 🟢 Joined trip room: ${roomName}`);
  } else {
    initSocketService(userId, role);
    setTimeout(() => {
      if (socket && socket.connected) {
        socket.emit('join_room', payload);
        socket.emit('join_trip_room', { tripId: idStr, room: roomName });
        console.log(`[SocketService] 🟢 Joined trip room on connect: ${roomName}`);
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
export function joinUserRoom(userId?: string, role: string = 'tourist', vehicleCategory?: string) {
  const session = getUserSessionSync();
  const effectiveUserId = userId || session?.id || null;
  const effectiveRole = role || session?.role || 'tourist';
  const effectiveCategory = vehicleCategory || session?.profile?.vehicle_category || session?.profile?.vehicle_type || undefined;

  currentUserId = effectiveUserId;
  currentRole = effectiveRole;

  if (socket && socket.connected) {
    socket.emit('join_room', {
      userId: effectiveUserId,
      role: effectiveRole,
      vehicleCategory: effectiveCategory,
      vehicleType: effectiveCategory,
      room: effectiveUserId ? `user:${effectiveUserId}` : undefined,
    });
    if (effectiveUserId) {
      socket.emit('join_room', { room: `user:${effectiveUserId}` });
    }
    console.log(`[SocketService] Emitted join_room for user:${effectiveUserId || 'guest'} role:${effectiveRole} category:${effectiveCategory || 'none'}`);
  }
}

/**
 * Emit real-time ride acceptance event to backend WebSocket server
 */
export function emitAcceptRideSocket(tripData: any) {
  if (socket && socket.connected) {
    socket.emit('accept_ride', tripData);
    console.log('[SocketService] Emitted accept_ride over WebSockets:', tripData);
  }
}

/**
 * Emit real-time ride decline event to backend WebSocket server
 */
export function emitDeclineRideSocket(tripData: any) {
  if (socket && socket.connected) {
    socket.emit('decline_ride', tripData);
    console.log('[SocketService] Emitted decline_ride over WebSockets:', tripData);
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

