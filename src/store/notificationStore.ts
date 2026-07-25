import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/constants/api';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  tripId?: string;
  role?: string;
  userId?: string;
}

export interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
}

const STORAGE_KEY = 'vibe_notification_store_v1';

let state: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function computeUnreadCount(notifications: NotificationItem[]): number {
  return notifications.filter((n) => !n.isRead).length;
}

function persistStateLocally() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Failed to persist notificationStore to localStorage:', e);
  }
}

function loadStateLocally() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.notifications)) {
          state = {
            notifications: parsed.notifications,
            unreadCount: computeUnreadCount(parsed.notifications),
          };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load notificationStore from localStorage:', e);
  }
}

// Load initial state on module load
loadStateLocally();

export const notificationStore = {
  getState(): NotificationState {
    return state;
  },

  setNotifications(list: NotificationItem[]): void {
    const formatted = list.map((item) => ({
      ...item,
      isRead: Boolean(item.isRead),
    }));
    state = {
      notifications: formatted,
      unreadCount: computeUnreadCount(formatted),
    };
    persistStateLocally();
    notifyListeners();
  },

  /**
   * Called when a new real-time push notification / WebSocket payload arrives.
   * If badge is hidden (unreadCount is 0), this increments unreadCount by 1
   * and re-renders the red badge.
   */
  addNotification(item: Partial<NotificationItem>): NotificationItem {
    const newItem: NotificationItem = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: item.title || 'New Notification',
      body: item.body || '',
      createdAt: item.createdAt || new Date().toISOString(),
      isRead: item.isRead ?? false,
      tripId: item.tripId,
      role: item.role,
      userId: item.userId,
    };

    const updated = [newItem, ...state.notifications];
    state = {
      notifications: updated,
      unreadCount: computeUnreadCount(updated),
    };

    persistStateLocally();
    notifyListeners();
    return newItem;
  },

  /**
   * Action triggered when user/driver taps/clicks the notification icon.
   * Marks all current notifications as read (isRead: true, unreadCount: 0).
   * Persists updated status locally and syncs via POST /api/v1/notifications/mark-read.
   */
  async markAllAsRead(userId?: string, role: string = 'driver'): Promise<void> {
    const updatedNotifications = state.notifications.map((n) => ({
      ...n,
      isRead: true,
    }));

    state = {
      notifications: updatedNotifications,
      unreadCount: 0,
    };

    persistStateLocally();
    notifyListeners();

    // Sync with backend endpoint
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || null, role }),
      });
    } catch (e) {
      console.warn('Failed to sync mark-read with backend endpoint:', e);
    }
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useNotificationStore(): NotificationState {
  const [currState, setCurrState] = useState<NotificationState>(notificationStore.getState());

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setCurrState({ ...notificationStore.getState() });
    });
    return unsubscribe;
  }, []);

  return currState;
}
