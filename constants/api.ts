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
  email?: string;
  password?: string;
  role: 'tourist' | 'driver' | 'guide';
  // Driver fields
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  license_number?: string;
  // Guide fields
  expertise?: string;
  license_id?: string;
  bio?: string;
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
