import { DeviceEventEmitter, Platform } from 'react-native';
import { adminState } from './admin-state';

const STORAGE_KEY = 'vibes_pending_driver_requests';
let broadcastChannel: any = null;

if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('vibes_trip_channel');
  } catch (e) {}
}

import { emitTripRequestSocket } from '@/src/services/socketService';

export function updateTripStatusGlobally(tripId: string, status: string, extraData?: any) {
  if (!tripId) return;
  const tid = String(tripId);
  const stLower = String(status || '').toLowerCase();
  const normalizedStatus = (stLower.includes('complete') || stLower.includes('finish') || stLower === 'done')
    ? 'Completed'
    : (stLower.includes('cancel') || stLower.includes('decline'))
    ? 'Cancelled'
    : status;

  const updateItem = (item: any) => {
    if (item && (String(item.id) === tid || String(item.tripId) === tid)) {
      item.status = normalizedStatus;
      if (extraData?.driverName || extraData?.driver_or_guide_name) {
        item.driverOrGuideName = extraData.driverName || extraData.driver_or_guide_name;
      }
      if (extraData?.driverId || extraData?.driver_id) {
        item.driverId = extraData.driverId || extraData.driver_id;
      }
      if (extraData?.otp) item.otp = extraData.otp;
      if (extraData?.endOtp) item.endOtp = extraData.endOtp;
    }
  };

  (adminState.userTrips || []).forEach(updateItem);
  (adminState.advanceBookings || []).forEach(updateItem);
  ((adminState as any).pendingDriverRequests || []).forEach(updateItem);
  (adminState.customTripRequests || []).forEach(updateItem);
}

export function broadcastNewTripRequest(tripObject: any) {
  if (!tripObject || !tripObject.id) return;

  // 1. In-Memory AdminState Synchronization
  adminState.userTrips = adminState.userTrips || [];
  if (!adminState.userTrips.some(t => t && String(t.id) === String(tripObject.id))) {
    adminState.userTrips.unshift(tripObject);
  }

  adminState.customTripRequests = adminState.customTripRequests || [];
  if (!adminState.customTripRequests.some(t => t && String(t.id) === String(tripObject.id))) {
    adminState.customTripRequests.unshift(tripObject);
  }

  (adminState as any).pendingDriverRequests = (adminState as any).pendingDriverRequests || [];
  if (!(adminState as any).pendingDriverRequests.some((t: any) => t && String(t.id) === String(tripObject.id))) {
    (adminState as any).pendingDriverRequests.unshift(tripObject);
  }

  // 2. React Native Local Event & WebSockets Emission
  try {
    DeviceEventEmitter.emit('new_driver_request', tripObject);
    emitTripRequestSocket(tripObject);
  } catch (e) {}

  // 3. Web localStorage & BroadcastChannel (Cross-Tab Real-Time Sync)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const existingStr = window.localStorage.getItem(STORAGE_KEY);
      let list: any[] = [];
      if (existingStr) {
        try { list = JSON.parse(existingStr); } catch (e) {}
      }
      list = [tripObject, ...list.filter((x: any) => x && x.id !== tripObject.id)].slice(0, 20);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'NEW_REQUEST', trip: tripObject });
      } catch (e) {}
    }
  }
}

export function getPendingTripRequestsSync(): any[] {
  let list: any[] = [];

  // Memory
  const memoryReqs = ((adminState as any).pendingDriverRequests || adminState.customTripRequests || []).filter(
    (r: any) => r && (r.status === 'Pending' || r.status === 'Booked' || !r.status)
  );
  list.push(...memoryReqs);

  // localStorage on Web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const storedStr = window.localStorage.getItem(STORAGE_KEY);
      if (storedStr) {
        const storedList = JSON.parse(storedStr);
        if (Array.isArray(storedList)) {
          list.push(...storedList.filter((r: any) => r && (r.status === 'Pending' || r.status === 'Booked' || !r.status)));
        }
      }
    } catch (e) {}
  }

  // Deduplicate by ID
  const unique = list.filter((item, index, self) =>
    item && item.id && index === self.findIndex(t => t && String(t.id) === String(item.id))
  );

  return unique;
}

export function listenForTripRequests(callback: (trip?: any) => void): () => void {
  const sub = DeviceEventEmitter.addListener('new_driver_request', (trip) => {
    callback(trip);
  });

  let storageListener: any = null;
  let channelListener: any = null;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    storageListener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        callback();
      }
    };
    try { window.addEventListener('storage', storageListener); } catch (e) {}

    if (broadcastChannel) {
      channelListener = (msgEvent: MessageEvent) => {
        if (msgEvent.data && msgEvent.data.type === 'NEW_REQUEST') {
          callback(msgEvent.data.trip);
        }
      };
      try { broadcastChannel.addEventListener('message', channelListener); } catch (e) {}
    }
  }

  return () => {
    sub.remove();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (storageListener) {
        try { window.removeEventListener('storage', storageListener); } catch (e) {}
      }
      if (broadcastChannel && channelListener) {
        try { broadcastChannel.removeEventListener('message', channelListener); } catch (e) {}
      }
    }
  };
}
