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
 * Fetch live Drivers list from backend
 */
export async function fetchDriversApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('fetchDriversApi error:', e);
  }
  return [];
}


