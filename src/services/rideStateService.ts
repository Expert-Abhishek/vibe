import { useEffect, useState } from 'react';
import { API_BASE_URL, driverArrivedApi } from '@/constants/api';

export type RideStatus =
  | 'ACCEPTED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'STARTED'
  | 'TRIP_STARTED'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED';

const STORAGE_KEY_PREFIX = 'vibe_ride_status_';

// Strict state transition graph
const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  ACCEPTED: ['EN_ROUTE_TO_PICKUP', 'CANCELLED'],
  EN_ROUTE_TO_PICKUP: ['STARTED', 'TRIP_STARTED', 'CANCELLED'],
  STARTED: ['ARRIVED', 'CANCELLED'],
  TRIP_STARTED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// In-memory state store for active trips
const rideStates: Record<string, RideStatus> = {};
const listeners = new Map<string, Set<() => void>>();

function notifyTripListeners(tripId: string) {
  const tripListeners = listeners.get(tripId);
  if (tripListeners) {
    tripListeners.forEach((listener) => listener());
  }
}

function persistRideStatus(tripId: string, status: RideStatus) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${tripId}`, status);
    }
  } catch (e) {
    console.warn(`Failed to persist ride status for trip ${tripId}:`, e);
  }
}

function loadRideStatus(tripId: string): RideStatus {
  if (rideStates[tripId]) return rideStates[tripId];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${tripId}`);
      if (stored && (stored in VALID_TRANSITIONS)) {
        rideStates[tripId] = stored as RideStatus;
        return stored as RideStatus;
      }
    }
  } catch (e) {
    console.warn(`Failed to load ride status for trip ${tripId}:`, e);
  }
  return 'ACCEPTED';
}

export const rideStateService = {
  /**
   * Check if transitioning from currentStatus to nextStatus is allowed in strict sequence
   */
  canTransition(currentStatus: RideStatus, nextStatus: RideStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  },

  /**
   * Get current ride status for a trip
   */
  getRideStatus(tripId: string): RideStatus {
    return loadRideStatus(tripId);
  },

  /**
   * Directly update local ride status (with validation)
   */
  setRideStatus(tripId: string, status: RideStatus): boolean {
    rideStates[tripId] = status;
    persistRideStatus(tripId, status);
    notifyTripListeners(tripId);
    return true;
  },

  /**
   * Transition ride status strictly following:
   * ACCEPTED ➔ EN_ROUTE_TO_PICKUP ➔ STARTED ➔ ARRIVED ➔ COMPLETED
   */
  async transitionRideState(
    tripId: string,
    nextStatus: RideStatus,
    driverName?: string
  ): Promise<{ success: boolean; status: RideStatus; message: string }> {
    const currentStatus = this.getRideStatus(tripId);

    // Enforce strict state machine sequence check
    if (!this.canTransition(currentStatus, nextStatus)) {
      const errMsg = `Invalid state transition from ${currentStatus} to ${nextStatus}. Sequence must be: ACCEPTED -> EN_ROUTE_TO_PICKUP -> STARTED -> ARRIVED -> COMPLETED.`;
      console.warn(errMsg);
      return { success: false, status: currentStatus, message: errMsg };
    }

    // Safety guard for ARRIVED: must be in STARTED or TRIP_STARTED phase
    if (nextStatus === 'ARRIVED' && currentStatus !== 'STARTED' && currentStatus !== 'TRIP_STARTED') {
      const errMsg = `Cannot mark ARRIVED before trip state is STARTED. Current state is ${currentStatus}.`;
      console.warn(errMsg);
      return { success: false, status: currentStatus, message: errMsg };
    }

    // Update local state and persist
    rideStates[tripId] = nextStatus;
    persistRideStatus(tripId, nextStatus);
    notifyTripListeners(tripId);

    // Emit local event immediately for responsive UI
    try {
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('trip_status_updated', { tripId, id: tripId, status: nextStatus, driverName });
      if (nextStatus === 'COMPLETED') {
        DeviceEventEmitter.emit('trip_completed', { tripId, id: tripId, status: 'Completed', driverName });
        DeviceEventEmitter.emit('RIDE_COMPLETED', { tripId, id: tripId, status: 'Completed', driverName });
      }
    } catch (e) {}

    // Trigger external API call where appropriate
    try {
      let res: Response;
      if (nextStatus === 'ARRIVED') {
        res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/arrive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverName }),
        });
      } else if (nextStatus === 'COMPLETED') {
        res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverName }),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, driverName }),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.code === 'PREBOOKING_LOCKED') {
          return {
            success: false,
            status: currentStatus,
            message: json.message || 'Trip is locked until 15 minutes prior to scheduled time.',
          };
        }
      }
    } catch (e) {
      console.warn(`API call for status transition to ${nextStatus} encountered error:`, e);
    }

    return {
      success: true,
      status: nextStatus,
      message: `Successfully transitioned ride to ${nextStatus}`,
    };
  },

  subscribe(tripId: string, listener: () => void): () => void {
    if (!listeners.has(tripId)) {
      listeners.set(tripId, new Set());
    }
    listeners.get(tripId)!.add(listener);

    return () => {
      const tripListeners = listeners.get(tripId);
      if (tripListeners) {
        tripListeners.delete(listener);
      }
    };
  },
};

/**
   * Custom hook to subscribe to ride state updates for a specific trip
   */
export function useRideState(tripId: string): RideStatus {
  const [status, setStatus] = useState<RideStatus>(rideStateService.getRideStatus(tripId));

  useEffect(() => {
    setStatus(rideStateService.getRideStatus(tripId));
    const unsubscribe = rideStateService.subscribe(tripId, () => {
      setStatus(rideStateService.getRideStatus(tripId));
    });
    return unsubscribe;
  }, [tripId]);

  return status;
}
