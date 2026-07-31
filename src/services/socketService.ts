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
 * Disconnect socket connection
 */
export function disconnectSocketService() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
