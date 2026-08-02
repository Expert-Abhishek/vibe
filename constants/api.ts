import { Platform } from 'react-native';

// For local testing:
// - Android Emulator: 10.0.2.2:5000
// - iOS Simulator / Web: localhost:5000
// - Physical Device: Replace with your PC local IP (e.g., http://192.168.1.10:5000)
const RENDER_API_URL = 'https://vibe-backend-tlaw.onrender.com';
const DEV_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || RENDER_API_URL || DEV_API_URL;

export interface RegisterPayload {
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  password?: string;

  role: 'tourist' | 'driver' | 'guide';
  // Driver fields
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  license_number?: string;
  photo_url?: string;
  rc_url?: string;
  dl_url?: string;
  insurance_url?: string;
  aadhar_url?: string;
  car_front_url?: string;
  car_left_url?: string;
  car_right_url?: string;
  car_back_url?: string;
  // Guide fields
  expertise?: string;
  license_id?: string;
  bio?: string;
  license_cert_url?: string;
  id_proof_url?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    status: string;
    profile?: any;
  };
  error?: string;
}

/**
 * Helper to call Node.js + PostgreSQL Backend Registration API
 */
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API registerUser error:', error);
    return {
      success: false,
      message: 'Failed to connect to backend server. Make sure Node.js server is running.',
      error: error?.message || String(error),
    };
  }
}

/**
 * Helper to call Node.js + PostgreSQL Backend Login API
 */
export async function loginUser(phone: string, pass: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password: pass }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API loginUser error:', error);
    return {
      success: false,
      message: 'Failed to connect to backend server. Make sure Node.js server is running.',
      error: error?.message || String(error),
    };
  }
}

/**
 * Helper to update user status (Admin API)
 */
export async function updateUserStatus(userId: string, status: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return await response.json();
  } catch (error: any) {
    console.error('API updateUserStatus error:', error);
    return { success: false, message: 'Failed to update user status' };
  }
}

/**
 * Helper to delete user (Admin API)
 */
export async function deleteUser(userId: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (error: any) {
    console.error('API deleteUser error:', error);
    return { success: false, message: 'Failed to delete user' };
  }
}

/**
 * Update Driver/User Profile on backend DB
 */
export async function updateUserProfileApi(userId: string, profileData: any): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    return await res.json();
  } catch (e) {
    console.warn('updateUserProfileApi error:', e);
    return { success: false, message: 'Network or server error' };
  }
}

/**
 * Fetch Trips assigned to Driver from backend DB
 */
export async function fetchDriverTripsApi(driverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/driver/${driverId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchDriverTripsApi error:', e);
  }
  return [];
}

/**
 * Fetch live Destinations / Tourist Places from backend
 */
export async function fetchDestinationsApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchDestinationsApi error:', e);
  }
  return [];
}

/**
 * Fetch live Tour Package Plans from backend
 */
export async function fetchPlansApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchPlansApi error:', e);
  }
  return [];
}

/**
 * Create a new Trip / Booking on backend
 */
export async function createTripApi(payload: {
  tripType: string;
  title: string;
  customerId?: string;
  customerName?: string;
  driverId?: string;
  guideId?: string;
  driverOrGuideName?: string;
  planId?: string;
  destinationIds?: string[];
  amount: number;
  paymentMode?: string;
  status?: string;
  durationHours?: number;
  extraHours?: number;
  addonCharge?: number;
  bookingType?: 'INSTANT' | 'PRE_BOOKED';
  scheduledTime?: string;
  pickupName?: string;
  dropName?: string;
  advanceDepositPaid?: number;
  remainingCashBalance?: number;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('createTripApi error:', e);
    return { success: false, message: 'Failed to save trip to backend' };
  }
}

/**
 * Check backend for active non-completed, non-cancelled trip for customer
 */
export async function fetchActiveTripApi(customerId: string): Promise<{ hasActiveTrip: boolean; trip: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/active-trip/${customerId}`);
    const data = await res.json();
    if (data.success) {
      return { hasActiveTrip: !!data.hasActiveTrip, trip: data.trip || null };
    }
  } catch (e) {
    console.warn('fetchActiveTripApi error:', e);
  }
  return { hasActiveTrip: false, trip: null };
}

/**
 * Fetch Customer Trip History from backend
 */
export async function fetchCustomerTripsApi(customerId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/customer/${customerId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchCustomerTripsApi error:', e);
  }
  return [];
}

/**
 * Fetch all Trips from backend DB
 */
export async function fetchTripsApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchTripsApi error:', e);
  }
  return [];
}

/**
 * Fetch live Drivers list from backend
 */
export async function fetchDriversApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers`);
    const data = await res.json();
    if (data.success) {
      if (Array.isArray(data.drivers)) {
        return data.drivers;
      }
      if (Array.isArray(data.data)) {
        return data.data;
      }
    }
  } catch (e) {
    console.warn('fetchDriversApi error:', e);
  }
  return [];
}

/**
 * Fetch live Guides list from backend
 */
export async function fetchGuidesApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guides`);
    const data = await res.json();
    if (data.success) {
      if (Array.isArray(data.guides)) {
        return data.guides;
      }
      if (Array.isArray(data.data)) {
        return data.data;
      }
    }
  } catch (e) {
    console.warn('fetchGuidesApi error:', e);
  }
  return [];
}

/**
 * Login user (Tourist, Driver, Guide) via phone/email & password
 */
export async function loginUserApi(payload: { identifier: string; password: string }): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.warn('loginUserApi error:', e);
    if (e?.name === 'AbortError') {
      return { success: false, message: 'Login request timed out. Please check network connection and try again.' };
    }
    return { success: false, message: e?.message || 'Server connection error. Please try again.' };
  }
}

/**
 * Google Sign-In backend auth
 */
export async function googleAuthApi(payload: { googleId: string; email: string; name: string; photo?: string; role?: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('googleAuthApi error:', e);
    return { success: false, message: 'Server connection error during Google auth' };
  }
}

/**
 * Driver update real-time GPS location
 */
export async function updateDriverLocationApi(driverId: string, latitude: number, longitude: number, isActive: boolean = true): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/driver-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, latitude, longitude, isActive }),
    });
    return await res.json();
  } catch (e) {
    console.warn('updateDriverLocationApi error:', e);
    return { success: false };
  }
}

/**
 * Fetch pending ride requests for Driver
 */
export async function fetchDriverRequestsApi(driverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/driver-requests/${driverId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchDriverRequestsApi error:', e);
  }
  return [];
}

/**
 * Driver Accept or Decline Ride Request
 */
export async function respondDriverRequestApi(tripId: string, driverId: string, action: 'accept' | 'decline' | 'complete', driverName?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, action, driverName }),
    });
    return await res.json();
  } catch (e) {
    console.warn('respondDriverRequestApi error:', e);
    return { success: false, message: 'Failed to respond to ride request' };
  }
}

/**
 * Wallet APIs
 */
export async function fetchWalletBalanceApi(userId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/${userId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchWalletBalanceApi error:', e);
    return { success: false, balance: 0, transactions: [] };
  }
}

export async function topupWalletApi(payload: { userId: string; amount: number; paymentId: string; description?: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('topupWalletApi error:', e);
    return { success: false, message: 'Wallet top-up failed' };
  }
}

/**
 * Fetch User Wallet History (Admin API)
 */
export async function fetchUserWalletHistoryApi(userId: string, page = 1, limit = 20, type = 'all', search = ''): Promise<any> {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      type,
      search,
    });
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/wallet-history?${queryParams.toString()}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchUserWalletHistoryApi error:', e);
    return { success: false, message: 'Failed to fetch user wallet history' };
  }
}

export async function submitWithdrawalApi(payload: { userId: string; userName?: string; role?: string; amount: number; upiId?: string; accountNumber?: string; ifscCode?: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('submitWithdrawalApi error:', e);
    return { success: false, message: 'Withdrawal request failed' };
  }
}

export async function createRazorpayOrderApi(payload: { amount: number; currency?: string; receipt?: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('createRazorpayOrderApi error:', e);
    return { success: false, message: 'Order creation failed' };
  }
}

export async function verifyRazorpayPaymentApi(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  userId?: string;
  amount?: number;
  description?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('verifyRazorpayPaymentApi error:', e);
    return { success: false, message: 'Payment verification failed' };
  }
}

export async function processCheckoutApi(payload: {
  userId: string;
  totalAmount: number;
  useWallet: boolean;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/checkout/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('processCheckoutApi error:', e);
    return { success: false, message: 'Checkout processing failed' };
  }
}

/**
 * Save user push notification token to backend PostgreSQL
 */
export async function savePushTokenApi(userId: string, pushToken: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pushToken }),
    });
    return await res.json();
  } catch (e) {
    console.warn('savePushTokenApi error:', e);
    return { success: false, message: 'Failed to upload push token' };
  }
}

/**
 * Admin broadcast notification to drivers/guides
 */
export async function sendAdminNotificationApi(payload: { userId?: string; role?: string; title: string; body: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/admin-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('sendAdminNotificationApi error:', e);
    return { success: false, message: 'Admin notification failed' };
  }
}

/**
 * Fetch Driver Statistics (Today KM, Trips Count, Today Earnings)
 */
export async function fetchDriverStatsApi(driverId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/driver-stats/${driverId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchDriverStatsApi error:', e);
    return { success: false, data: { todayKm: 0, tripsCount: 0, todayEarnings: 0 } };
  }
}

/**
 * Fetch Driver Advance Schedules from backend DB
 */
export async function fetchDriverAdvanceSchedulesApi(driverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/driver-advance-schedules/${driverId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchDriverAdvanceSchedulesApi error:', e);
  }
  return [];
}

/**
 * Fetch Driver Trip History (Scheduled vs Completed)
 */
export async function fetchDriverTripHistoryApi(driverId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/driver-history/${driverId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchDriverTripHistoryApi error:', e);
    return { success: false, data: { scheduled: [], completed: [], all: [] } };
  }
}

/**
 * Fetch User/Tourist Trip History (Active vs Completed)
 */
export async function fetchUserTripHistoryApi(customerId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/user-history/${customerId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchUserTripHistoryApi error:', e);
    return { success: false, data: { active: [], completed: [], all: [] } };
  }
}

/**
 * Fetch Guide Statistics (Trips Count, Today Earnings)
 */
export async function fetchGuideStatsApi(guideId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/guide-stats/${guideId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchGuideStatsApi error:', e);
    return { success: false, data: { tripsCount: 0, todayEarnings: 0 } };
  }
}

/**
 * Fetch Guide Advance Schedules from backend DB
 */
export async function fetchGuideAdvanceSchedulesApi(guideId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/guide-advance-schedules/${guideId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchGuideAdvanceSchedulesApi error:', e);
  }
  return [];
}

/**
 * Fetch User Profile (Tourist, Driver, or Guide) from backend DB
 */
export async function fetchUserProfileApi(userId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/profile`);
    return await res.json();
  } catch (e) {
    console.warn('fetchUserProfileApi error:', e);
    return { success: false, user: null };
  }
}

/**
 * Update user password after verifying current password
 */
export async function updatePasswordApi(payload: { userId: string; currentPassword?: string; current_password?: string; newPassword?: string; new_password?: string }): Promise<any> {
  try {
    const currentPassword = payload.currentPassword || payload.current_password;
    const newPassword = payload.newPassword || payload.new_password;
    const res = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: payload.userId, currentPassword, newPassword }),
    });
    return await res.json();
  } catch (e) {
    console.warn('updatePasswordApi error:', e);
    return { success: false, message: 'Password update connection failed' };
  }
}

/**
 * Create a new Cab / Guide booking and dispatch push notifications
 */
export async function bookTripApi(payload: {
  tripType?: string;
  title?: string;
  customerId?: string;
  customerName?: string;
  pickupName?: string;
  dropName?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  amount?: number;
  paymentMode?: string;
  bookingType?: string;
  scheduledTime?: string;
  advanceDepositPaid?: number;
  remainingCashBalance?: number;
  selectedDriverId?: string;
  driverId?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('bookTripApi error:', e);
    return { success: false, message: 'Booking failed. Check network connection.' };
  }
}

/**
 * Fetch Pending trip requests for Driver or Guide dashboard
 */
export async function fetchPendingRequestsApi(role: string = 'driver'): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/pending-requests?role=${role}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (e) {
    console.warn('fetchPendingRequestsApi error:', e);
  }
  return [];
}

/**
 * Driver / Guide accepts trip booking
 */
export async function acceptTripApi(tripId: string, driverId: string, driverName?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, driverName }),
    });
    return await res.json();
  } catch (e) {
    console.warn('acceptTripApi error:', e);
    return { success: false, message: 'Failed to accept trip' };
  }
}

/**
 * Cancel a trip booking (tourist, driver, guide)
 */
export async function cancelTripApi(tripId: string, options: { reason?: string; cancelledBy?: string; role?: string } = {}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: options.reason || 'User cancelled',
        cancelledBy: options.cancelledBy || 'tourist',
        role: options.role || 'tourist',
      }),
    });
    return await res.json();
  } catch (e) {
    console.warn('cancelTripApi error:', e);
    return { success: false, message: 'Failed to cancel trip' };
  }
}

/**
 * Verify 4-digit OTP code to start trip
 */
export async function verifyTripOtpApi(tripId: string, otp: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    return await res.json();
  } catch (e) {
    console.warn('verifyTripOtpApi error:', e);
    return { success: false, message: 'Failed to verify OTP' };
  }
}

/**
 * Verify 4-digit OTP code to end trip
 */
export async function verifyTripEndOtpApi(tripId: string, otp: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/verify-end-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    return await res.json();
  } catch (e) {
    console.warn('verifyTripEndOtpApi error:', e);
    return { success: false, message: 'Failed to verify End OTP' };
  }
}

/**
 * Complete trip & settle earnings to wallet
 */
export async function completeTripApi(tripId: string, driverId?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    return await res.json();
  } catch (e) {
    console.warn('completeTripApi error:', e);
    return { success: false, message: 'Failed to complete trip' };
  }
}

/**
 * Driver taps "Arrived at Pickup"
 */
export async function driverArrivedApi(tripId: string, driverName?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/arrive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverName }),
    });
    return await res.json();
  } catch (e) {
    console.warn('driverArrivedApi error:', e);
    return { success: false, message: 'Failed to update arrive status' };
  }
}

/**
 * Fetch Activity Notifications for Bell Icon drawer
 */
export async function fetchNotificationsApi(userId: string, role: string = 'tourist'): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/notifications/${userId}?role=${role}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (e) {
    console.warn('fetchNotificationsApi error:', e);
  }
  return [];
}

/**
 * Fetch Live Driver Location & Status for Tourist Map Tracking
 */
export async function fetchLiveLocationApi(tripId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/live-location/${tripId}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchLiveLocationApi error:', e);
    return { success: false, data: null };
  }
}

/**
 * Save user theme & language preferences to database
 */
export async function saveUserSettingsApi(userId: string, settings: { theme?: 'light' | 'dark'; language?: string }): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...settings }),
    });
    return await res.json();
  } catch (e) {
    console.warn('saveUserSettingsApi error:', e);
    return { success: false, message: 'Failed to save settings to server' };
  }
}

/**
 * Update Profile Photo for Rider / Driver / Guide
 */
export async function updateProfilePhotoApi(userId: string, role: string, photoData: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoData, role }),
    });
    return await res.json();
  } catch (e) {
    console.warn('updateProfilePhotoApi error:', e);
    return { success: false, message: 'Failed to update profile photo' };
  }
}

/**
 * Fetch Admin Payment Settings (QR Code & UPI ID)
 */
export async function fetchAdminPaymentSettingsApi(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/payment-settings`);
    return await res.json();
  } catch (e) {
    console.warn('fetchAdminPaymentSettingsApi error:', e);
    return {
      success: true,
      data: {
        upiId: 'vibe.pay@upi',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform',
      },
    };
  }
}

/**
 * Submit Wallet Top-Up Request (with 5-minute timer & screenshot proof)
 */
export async function submitWalletTopupRequestApi(payload: {
  userId: string;
  userName?: string;
  role?: string;
  amount: number;
  screenshotUrl: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/topup-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('submitWalletTopupRequestApi error:', e);
    return { success: false, message: 'Failed to submit top-up request' };
  }
}

/**
 * Submit Wallet Deduction/Payment Request (with optional screenshot proof)
 */
export async function submitWalletDeductionRequestApi(payload: {
  userId: string;
  userName?: string;
  role?: string;
  amount: number;
  description?: string;
  screenshotUrl?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/deduction-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('submitWalletDeductionRequestApi error:', e);
    return { success: false, message: 'Failed to submit deduction request' };
  }
}

/**
 * Fetch Pending Wallet Top-Up Requests for Admin Queue
 */
export async function fetchPendingTopupRequestsApi(status: string = 'Pending'): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests?status=${status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (e) {
    console.warn('fetchPendingTopupRequestsApi error:', e);
  }
  return [];
}

/**
 * Admin Approve Top-Up Request
 */
export async function approveTopupRequestApi(requestId: string, adminId?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId }),
    });
    return await res.json();
  } catch (e) {
    console.warn('approveTopupRequestApi error:', e);
    return { success: false, message: 'Failed to approve top-up request' };
  }
}

/**
 * Admin Reject Top-Up Request
 */
export async function rejectTopupRequestApi(requestId: string, rejectReason?: string, adminId?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectReason, adminId }),
    });
    return await res.json();
  } catch (e) {
    console.warn('rejectTopupRequestApi error:', e);
    return { success: false, message: 'Failed to reject top-up request' };
  }
}

/**
 * Fetch Driver Upcoming / Scheduled Pre-Booked Trips
 */
export async function fetchDriverUpcomingTripsApi(driverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/upcoming/${driverId}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (e) {
    console.warn('fetchDriverUpcomingTripsApi error:', e);
  }
  return [];
}

/**
 * Driver Decline Pending Pre-Booked Request (Redispatches to Pending Pool)
 */
export async function declineTripApi(tripId: string, driverId?: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    return await res.json();
  } catch (e) {
    console.warn('declineTripApi error:', e);
    return { success: false, message: 'Failed to decline trip' };
  }
}

type WalletListener = () => void;
const walletListeners = new Set<WalletListener>();

export function subscribeWalletChange(listener: WalletListener) {
  walletListeners.add(listener);
  return () => { walletListeners.delete(listener); };
}

export function notifyWalletChanged() {
  walletListeners.forEach(fn => {
    try { fn(); } catch (e) { console.warn('Wallet listener error:', e); }
  });
}

/**
 * Deduct trip payment from user wallet
 */
export async function deductWalletApi(payload: { userId: string; amount: number; tripId?: string; description?: string }): Promise<any> {
  notifyWalletChanged();
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/trip-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    notifyWalletChanged();
    return json;
  } catch (e) {
    console.warn('deductWalletApi error:', e);
    return { success: false, message: 'Wallet deduction failed. Check server connection.' };
  }
}
