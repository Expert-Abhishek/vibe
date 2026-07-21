export type KYCStatus = 'Active' | 'Pending KYC' | 'KYC Declined' | 'Inactive';

export interface TripRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip';
  title: string;
  customerName: string;
  driverOrGuideName?: string;
  date: string;
  amount: number;
  paymentMode: 'UPI' | 'Cash';
  status: 'Completed' | 'Upcoming' | 'Cancelled';
  rating?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  dateJoined: string;
  walletBalance: number;
  totalSpent: number;
  totalTripsCount: number;
  recentTrips: TripRecord[];
}

export interface DriverDocs {
  photo: string | null;
  rc: string | null;
  dl: string | null;
  insurance: string | null;
  aadhar: string | null;
}

export interface CarPhotos {
  front: string | null;
  left: string | null;
  right: string | null;
  back: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  licenseNumber: string;
  status: KYCStatus;
  rating: number;
  walletBalance: number;
  dateRegistered: string;
  dailyRate?: number;
  hourlyAddonRate?: number;
  docs: DriverDocs;
  carPhotos: CarPhotos;
}

export interface Guide {
  id: string;
  name: string;
  phone: string;
  email?: string;
  expertise: string;
  licenseId: string;
  bio: string;
  status: KYCStatus;
  rating: number;
  walletBalance: number;
  dateRegistered: string;
  dailyRate?: number;
  documents: {
    photo: string | null;
    licenseCert: string | null;
    idProof: string | null;
  };
}

export interface DriverRateConfig {
  id: string;
  vehicleType: string;
  vehicleName: string;
  capacity: string;
  dayRate: number; // /day charge
  addonRatePerHour: number; // addon per hr
  image: string;
}

export interface GuideRateConfig {
  id: string;
  category: string;
  description: string;
  dayRate: number; // /day charge
  image: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDrivers: number;
  totalGuides: number;
  totalRevenue: number;
  activeBookings: number;
  revenueTrend: { month: string; revenue: number; trips: number }[];
  recentActivities: {
    id: string;
    type: 'registration' | 'kyc_pending' | 'trip_completed';
    user: string;
    detail: string;
    time: string;
  }[];
}

export interface Destination {
  id: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  videos: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanCheckpoint {
  planDestinationId?: string;
  destinationId: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  videos: string[];
  isMasterActive?: boolean;
  isActiveInPlan: boolean;
  orderIndex?: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  km: number;
  duration: string; // e.g. "2 Days / 1 Night", "8 Hours"
  price: number;
  isActive: boolean;
  checkpoints: PlanCheckpoint[];
  createdAt?: string;
  updatedAt?: string;
}


