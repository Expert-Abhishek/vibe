import {
  Customer,
  DashboardStats,
  Destination,
  Driver,
  DriverRateConfig,
  Guide,
  GuideRateConfig,
  Plan
} from './types';


const LIVE_BACKEND_URL = 'https://vibe-backend-tlaw.onrender.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || LIVE_BACKEND_URL;



// Mock Initial Datasets (Set to empty arrays for fresh testing)
export const initialCustomers: Customer[] = [];

export const initialDrivers: Driver[] = [];

export const initialGuides: Guide[] = [];

export const initialDriverRates: DriverRateConfig[] = [];

export const initialGuideRates: GuideRateConfig[] = [];

export const getDashboardStats = (customersCount: number, driversCount: number, guidesCount: number): DashboardStats => {
  return {
    totalCustomers: customersCount,
    totalDrivers: driversCount,
    totalGuides: guidesCount,
    totalRevenue: 0,
    activeBookings: 0,
    revenueTrend: [
      { month: 'Jan', revenue: 0, trips: 0 },
      { month: 'Feb', revenue: 0, trips: 0 },
      { month: 'Mar', revenue: 0, trips: 0 },
      { month: 'Apr', revenue: 0, trips: 0 },
      { month: 'May', revenue: 0, trips: 0 },
      { month: 'Jun', revenue: 0, trips: 0 },
      { month: 'Jul', revenue: 0, trips: 0 },
    ],
    recentActivities: []
  };
};

export async function fetchCustomersApi(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/customers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.customers)) {
      return data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || `${c.phone}@vibzz.com`,
        status: c.status || 'Active',
        dateJoined: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        walletBalance: 0,
        totalSpent: 0,
        totalTripsCount: 0,
        recentTrips: []
      }));
    }
  } catch (e) {
    console.warn('Error fetching backend customers:', e);
  }
  return [];
}

export async function fetchDriversApi(): Promise<Driver[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.drivers)) {
      return data.drivers.map((d: any) => ({
        id: d.user_id,
        name: d.name,
        phone: d.phone,
        alternatePhone: d.alternate_phone || d.alt_phone || undefined,
        email: d.email || undefined,
        vehicleType: d.vehicle_type || '5seater',
        vehicleModel: d.vehicle_model || 'Standard Cab',
        vehicleNumber: d.vehicle_number || 'N/A',
        licenseNumber: d.license_number || 'N/A',
        status: d.status || 'Pending KYC',
        rating: Number(d.rating) || 5.0,
        walletBalance: Number(d.wallet_balance) || 0,
        dateRegistered: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dailyRate: Number(d.daily_rate) || 2500,
        hourlyAddonRate: Number(d.hourly_addon_rate) || 200,
        platformFee: d.platform_fee !== undefined ? Number(d.platform_fee) : 10,
        docs: {
          photo: d.photo_url || null,
          rc: d.rc_url || null,
          dl: d.dl_url || null,
          insurance: d.insurance_url || null,
          aadhar: d.aadhar_url || null,
        },
        carPhotos: {
          front: d.car_front_url || null,
          left: d.car_left_url || null,
          right: d.car_right_url || null,
          back: d.car_back_url || null,
        }
      }));
    }
  } catch (e) {
    console.warn('Error fetching backend drivers:', e);
  }
  return [];
}

export async function fetchGuidesApi(): Promise<Guide[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guides`);
    const data = await res.json();
    if (data.success && Array.isArray(data.guides)) {
      return data.guides.map((g: any) => ({
        id: g.user_id,
        name: g.name,
        phone: g.phone,
        alternatePhone: g.alternate_phone || g.alt_phone || undefined,
        email: g.email || undefined,
        expertise: g.expertise || 'General Tour Guide',
        licenseId: g.license_id || 'N/A',
        bio: g.bio || 'Tour guide profile',
        status: g.status || 'Pending KYC',
        rating: Number(g.rating) || 5.0,
        walletBalance: Number(g.wallet_balance) || 0,
        dateRegistered: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dailyRate: Number(g.daily_rate) || 2000,
        platformFee: g.platform_fee !== undefined ? Number(g.platform_fee) : 10,
        documents: {
          photo: g.photo_url || null,
          licenseCert: g.license_cert_url || null,
          idProof: g.id_proof_url || null,
        }
      }));
    }
  } catch (e) {
    console.warn('Error fetching backend guides:', e);
  }
  return [];
}

export async function updateUserStatusApi(userId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error updating status on backend:', e);
    return false;
  }
}

export interface DeductionRequest {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  amount: number;
  description?: string;
  screenshot_url?: string;
  status: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
}

export async function fetchDeductionRequestsApi(status = 'Pending'): Promise<DeductionRequest[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/deduction-requests?status=${status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching deduction requests:', e);
  }
  return [];
}

export async function approveDeductionRequestApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/deduction-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error approving deduction request:', e);
    return false;
  }
}

export async function rejectDeductionRequestApi(id: string, rejectReason: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/deduction-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectReason }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error rejecting deduction request:', e);
    return false;
  }
}

export async function updateDriverRateApi(userId: string, dailyRate: number, hourlyAddonRate: number, platformFee: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers/${userId}/rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_rate: dailyRate, hourly_addon_rate: hourlyAddonRate, platform_fee: platformFee }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error updating driver rate on backend:', e);
    return false;
  }
}

export async function updateGuideRateApi(userId: string, dailyRate: number, platformFee: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guides/${userId}/rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_rate: dailyRate, platform_fee: platformFee }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error updating guide rate on backend:', e);
    return false;
  }
}

export async function deleteUserApi(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error deleting user on backend:', e);
    return false;
  }
}

// ==========================================
// MOCK DATASETS: DESTINATION MASTER & PLANS
// ==========================================

export const initialDestinations: Destination[] = [];

export const initialPlans: Plan[] = [];

// ==========================================
// API HELPER FUNCTIONS FOR DESTINATIONS & PLANS
// ==========================================

export async function clearAllDataApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/clear-all-data`, { method: 'POST' });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error clearing database data:', e);
    return false;
  }
}

export async function fetchDestinationsApi(): Promise<Destination[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching destinations from backend:', e);
  }
  return [];
}

export async function createDestinationApi(payload: Partial<Destination>): Promise<Destination | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error creating destination on backend:', e);
  }
  return null;
}

export async function updateDestinationApi(id: string, payload: Partial<Destination>): Promise<Destination | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error updating destination on backend:', e);
  }
  return null;
}

export async function toggleDestinationStatusApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/${id}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error toggling destination status on backend:', e);
    return false;
  }
}

export async function deleteDestinationApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error deleting destination on backend:', e);
    return false;
  }
}

export async function fetchPlansApi(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching plans from backend:', e);
  }
  return [];
}

export async function createPlanApi(payload: { name: string; description: string; km: number; duration: string; price: number; destinationIds: string[] }): Promise<Plan | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error creating plan on backend:', e);
  }
  return null;
}

export async function updatePlanApi(id: string, payload: Partial<Plan>): Promise<Plan | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error updating plan on backend:', e);
  }
  return null;
}

export async function togglePlanStatusApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error toggling plan on backend:', e);
    return false;
  }
}

export async function deletePlanApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error deleting plan on backend:', e);
    return false;
  }
}

export async function addPlanDestinationApi(planId: string, destinationId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/destinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error adding destination to plan on backend:', e);
    return false;
  }
}

export async function togglePlanDestinationApi(planId: string, destinationId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/destinations/${destinationId}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error toggling checkpoint in plan on backend:', e);
    return false;
  }
}

export async function deletePlanDestinationApi(planId: string, destinationId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/destinations/${destinationId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error removing checkpoint from plan on backend:', e);
    return false;
  }
}

// Payment Settings and Manual Wallet Balance API

export interface PaymentSettings {
  id?: string;
  upi_id: string;
  qr_code_url: string;
  updated_at?: string;
}

export async function fetchPaymentSettingsApi(): Promise<PaymentSettings | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/payment-settings`);
    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching payment settings:', e);
  }
  return null;
}

export async function updatePaymentSettingsApi(upiId: string, qrCodeUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/payment-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_id: upiId, qr_code_url: qrCodeUrl }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error updating payment settings:', e);
    return false;
  }
}

export async function adjustWalletBalanceApi(userId: string, amount: number, description: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/admin/adjust-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, description }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error adjusting wallet balance:', e);
    return false;
  }
}

export interface TopupRequest {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  amount: number;
  screenshot_url: string;
  status: string;
  requested_at: string;
  expires_at: string;
  reject_reason?: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  amount: number;
  upi_id?: string;
  account_number?: string;
  ifsc_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchTopupRequestsApi(status = 'Pending'): Promise<TopupRequest[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests?status=${status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching topup requests:', e);
  }
  return [];
}

export async function approveTopupRequestApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error approving topup request:', e);
    return false;
  }
}

export async function rejectTopupRequestApi(id: string, rejectReason: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/wallet/topup-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectReason }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error rejecting topup request:', e);
    return false;
  }
}

export async function fetchWithdrawalsApi(status = 'Pending'): Promise<WithdrawalRequest[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/admin/withdrawals?status=${status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching withdrawals:', e);
  }
  return [];
}

export async function approveWithdrawalApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error approving withdrawal:', e);
    return false;
  }
}
export async function rejectWithdrawalApi(id: string, rejectReason: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectReason }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Error rejecting withdrawal:', e);
    return false;
  }
}

export interface UnifiedTransaction {
  id: string;
  type: 'topup' | 'withdrawal' | 'deduction';
  user_id: string;
  user_name: string;
  role: string;
  amount: number;
  status: string;
  created_at: string;
  screenshot_url?: string;
  description?: string;
  upi_id?: string;
  account_number?: string;
  ifsc_code?: string;
  reject_reason?: string;
  rawItem: TopupRequest | WithdrawalRequest | DeductionRequest;
}

export async function fetchAllTransactionsApi(
  typeFilter: 'all' | 'topup' | 'withdrawal' | 'deduction' = 'all',
  statusFilter: string = 'Pending'
): Promise<{
  transactions: UnifiedTransaction[];
  stats: {
    pendingTopupsCount: number;
    pendingTopupsSum: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsSum: number;
    pendingDeductionsCount: number;
    pendingDeductionsSum: number;
  };
}> {
  const [topups, withdrawals, deductions] = await Promise.all([
    fetchTopupRequestsApi(statusFilter),
    fetchWithdrawalsApi(statusFilter),
    fetchDeductionRequestsApi(statusFilter),
  ]);

  const normalizedTopups: UnifiedTransaction[] = topups.map((t) => ({
    id: t.id,
    type: 'topup',
    user_id: t.user_id,
    user_name: t.user_name || 'User',
    role: t.role || 'tourist',
    amount: parseFloat(t.amount.toString()),
    status: t.status,
    created_at: t.requested_at || new Date().toISOString(),
    screenshot_url: t.screenshot_url,
    reject_reason: t.reject_reason,
    rawItem: t,
  }));

  const normalizedWithdrawals: UnifiedTransaction[] = withdrawals.map((w) => ({
    id: w.id,
    type: 'withdrawal',
    user_id: w.user_id,
    user_name: w.user_name || 'User',
    role: w.role || 'driver',
    amount: parseFloat(w.amount.toString()),
    status: w.status,
    created_at: w.created_at || new Date().toISOString(),
    upi_id: w.upi_id,
    account_number: w.account_number,
    ifsc_code: w.ifsc_code,
    rawItem: w,
  }));

  const normalizedDeductions: UnifiedTransaction[] = deductions.map((d) => ({
    id: d.id,
    type: 'deduction',
    user_id: d.user_id,
    user_name: d.user_name || 'Customer',
    role: d.role || 'tourist',
    amount: parseFloat(d.amount.toString()),
    status: d.status,
    created_at: d.requested_at || new Date().toISOString(),
    description: d.description,
    screenshot_url: d.screenshot_url,
    reject_reason: d.reject_reason,
    rawItem: d,
  }));

  // Calculate pending stats across all
  const stats = {
    pendingTopupsCount: statusFilter === 'Pending' ? normalizedTopups.length : 0,
    pendingTopupsSum: statusFilter === 'Pending' ? normalizedTopups.reduce((acc, curr) => acc + curr.amount, 0) : 0,
    pendingWithdrawalsCount: statusFilter === 'Pending' ? normalizedWithdrawals.length : 0,
    pendingWithdrawalsSum: statusFilter === 'Pending' ? normalizedWithdrawals.reduce((acc, curr) => acc + curr.amount, 0) : 0,
    pendingDeductionsCount: statusFilter === 'Pending' ? normalizedDeductions.length : 0,
    pendingDeductionsSum: statusFilter === 'Pending' ? normalizedDeductions.reduce((acc, curr) => acc + curr.amount, 0) : 0,
  };

  let combined: UnifiedTransaction[] = [];
  if (typeFilter === 'topup') {
    combined = normalizedTopups;
  } else if (typeFilter === 'withdrawal') {
    combined = normalizedWithdrawals;
  } else if (typeFilter === 'deduction') {
    combined = normalizedDeductions;
  } else {
    combined = [...normalizedTopups, ...normalizedWithdrawals, ...normalizedDeductions];
  }

  // Sort descending by date
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { transactions: combined, stats };
}



