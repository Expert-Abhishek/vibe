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
    return { success: false, message: 'Failed to update profile on backend' };
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
  driverOrGuideName?: string;
  planId?: string;
  destinationIds?: string[];
  amount: number;
  paymentMode?: string;
  status?: string;
  durationHours?: number;
  extraHours?: number;
  addonCharge?: number;
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
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.warn('loginUserApi error:', e);
    return { success: false, message: 'Server connection error' };
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
export async function respondDriverRequestApi(tripId: string, driverId: string, action: 'accept' | 'decline', driverName?: string): Promise<any> {
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




