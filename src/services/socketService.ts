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
      // Quietly notice connection error without spamming Reactotron
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

    return socket;
  } catch (err) {
    console.warn('[SocketService] Failed to initialize socket connection:', err);
    return null;
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
