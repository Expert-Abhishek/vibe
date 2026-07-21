import {
  Customer,
  Driver,
  Guide,
  DriverRateConfig,
  GuideRateConfig,
  DashboardStats,
  Destination,
  Checkpoint,
  Plan,
  PlanCheckpoint,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';


// Mock Initial Datasets
export const initialCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'Nikitha Rao',
    phone: '9876543210',
    email: 'nikitha.rao@gmail.com',
    status: 'Active',
    dateJoined: '2026-06-15',
    walletBalance: 1250,
    totalSpent: 8400,
    totalTripsCount: 12,
    recentTrips: [
      { id: 't1', type: 'cab', title: 'MG Road ➔ Kempegowda Airport', customerName: 'Nikitha Rao', driverOrGuideName: 'Suresh Kumar', date: '2026-07-18', amount: 1200, paymentMode: 'UPI', status: 'Completed', rating: 5 },
      { id: 't2', type: 'guide', title: 'Hampi Heritage Full Day Tour', customerName: 'Nikitha Rao', driverOrGuideName: 'Krishna Murthy', date: '2026-07-10', amount: 2500, paymentMode: 'UPI', status: 'Completed', rating: 5 },
      { id: 't3', type: 'custom_trip', title: 'Coorg Coffee Plantation Trail', customerName: 'Nikitha Rao', driverOrGuideName: 'Raju Auto', date: '2026-07-02', amount: 4700, paymentMode: 'Cash', status: 'Completed', rating: 4 },
    ]
  },
  {
    id: 'c2',
    name: 'Rahul Verma',
    phone: '9812345678',
    email: 'rahul.v@outlook.com',
    status: 'Active',
    dateJoined: '2026-07-01',
    walletBalance: 450,
    totalSpent: 3200,
    totalTripsCount: 4,
    recentTrips: [
      { id: 't4', type: 'cab', title: 'Indiranagar ➔ Electronic City', customerName: 'Rahul Verma', driverOrGuideName: 'Suresh Kumar', date: '2026-07-19', amount: 650, paymentMode: 'UPI', status: 'Completed', rating: 4 },
      { id: 't5', type: 'cab', title: 'Whitefield ➔ Majestic', customerName: 'Rahul Verma', driverOrGuideName: 'Amit Singh', date: '2026-07-14', amount: 800, paymentMode: 'Cash', status: 'Completed', rating: 5 },
    ]
  },
  {
    id: 'c3',
    name: 'Ananya Sharma',
    phone: '9988776655',
    email: 'ananya.sharma@yahoo.com',
    status: 'Active',
    dateJoined: '2026-05-20',
    walletBalance: 2100,
    totalSpent: 14500,
    totalTripsCount: 18,
    recentTrips: [
      { id: 't6', type: 'guide', title: 'Mysore Palace & Chamundi Hill Tour', customerName: 'Ananya Sharma', driverOrGuideName: 'Krishna Murthy', date: '2026-07-15', amount: 3000, paymentMode: 'UPI', status: 'Completed', rating: 5 },
    ]
  },
  {
    id: 'c4',
    name: 'Priya Patel',
    phone: '9765432109',
    email: 'priya.patel@gmail.com',
    status: 'Inactive',
    dateJoined: '2026-04-10',
    walletBalance: 0,
    totalSpent: 1100,
    totalTripsCount: 2,
    recentTrips: []
  }
];

export const initialDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'Suresh Kumar',
    phone: '9876543210',
    email: 'suresh.driver@vibzz.com',
    vehicleType: '5seater',
    vehicleModel: 'Toyota Etios (AC)',
    vehicleNumber: 'KA-03-MY-7788',
    licenseNumber: 'DL-042019008892',
    status: 'Active',
    rating: 4.9,
    walletBalance: 4850,
    dateRegistered: '2026-05-10',
    docs: {
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      rc: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
      dl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      insurance: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      aadhar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    carPhotos: {
      front: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      left: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
      right: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
      back: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80',
    }
  },
  {
    id: 'd2',
    name: 'Amit Singh',
    phone: '9888877776',
    email: 'amit.singh@gmail.com',
    vehicleType: '7seater',
    vehicleModel: 'Maruti Ertiga (AC)',
    vehicleNumber: 'KA-05-AB-1234',
    licenseNumber: 'DL-012021001122',
    status: 'Pending KYC',
    rating: 4.5,
    walletBalance: 1200,
    dateRegistered: '2026-07-18',
    docs: {
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      rc: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
      dl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      insurance: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      aadhar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    carPhotos: {
      front: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      left: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
      right: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
      back: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80',
    }
  },
  {
    id: 'd3',
    name: 'Vikram Gowda',
    phone: '9444455555',
    email: 'vikram.gowda@gmail.com',
    vehicleType: '4x4jeep',
    vehicleModel: 'Mahindra Thar 4x4',
    vehicleNumber: 'KA-12-Z-9999',
    licenseNumber: 'DL-092018004455',
    status: 'Inactive',
    rating: 4.8,
    walletBalance: 3100,
    dateRegistered: '2026-06-01',
    docs: {
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      rc: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
      dl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      insurance: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      aadhar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    carPhotos: {
      front: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      left: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      right: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      back: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    }
  },
  {
    id: 'd4',
    name: 'Raju Auto',
    phone: '9123456789',
    email: 'raju.auto@gmail.com',
    vehicleType: 'auto',
    vehicleModel: 'Bajaj RE Auto Rickshaw',
    vehicleNumber: 'KA-04-E-5566',
    licenseNumber: 'DL-042015007788',
    status: 'Active',
    rating: 4.7,
    walletBalance: 2150,
    dateRegistered: '2026-04-12',
    docs: {
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      rc: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
      dl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      insurance: null,
      aadhar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    carPhotos: {
      front: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=600&q=80',
      left: null,
      right: null,
      back: null,
    }
  }
];

export const initialGuides: Guide[] = [
  {
    id: 'g1',
    name: 'Krishna Murthy',
    phone: '8765432109',
    email: 'krishna.guide@vibzz.com',
    expertise: 'History & Heritage Walks',
    licenseId: 'KA-GUIDE-2022-881',
    bio: 'Certified Karnataka Tourism guide with 8+ years experience in Hampi, Belur & Mysore heritage circuits.',
    status: 'Active',
    rating: 4.95,
    walletBalance: 6400,
    dateRegistered: '2026-03-15',
    documents: {
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      licenseCert: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      idProof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    }
  },
  {
    id: 'g2',
    name: 'Ramesh Gowda',
    phone: '8123456780',
    email: 'ramesh.gowda@gmail.com',
    expertise: 'Nature Trails & Trekking',
    licenseId: 'KA-GUIDE-2024-104',
    bio: 'Wilderness survival & trekking guide specializing in Western Ghats & Coorg coffee estate walks.',
    status: 'Active',
    rating: 4.85,
    walletBalance: 3800,
    dateRegistered: '2026-05-01',
    documents: {
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
      licenseCert: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      idProof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    }
  },
  {
    id: 'g3',
    name: 'Anjali Hegde',
    phone: '8999900001',
    email: 'anjali.hegde@gmail.com',
    expertise: 'Food & Local Culture Tours',
    licenseId: 'KA-GUIDE-2026-009',
    bio: 'Culinary explorer & cultural storyteller covering South Indian temple architecture & street food.',
    status: 'Pending KYC',
    rating: 4.7,
    walletBalance: 0,
    dateRegistered: '2026-07-17',
    documents: {
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      licenseCert: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      idProof: null,
    }
  }
];

export const initialDriverRates: DriverRateConfig[] = [
  {
    id: 'r1',
    vehicleType: '5seater',
    vehicleName: '5-Seater Sedan (AC)',
    capacity: '4 Passengers + Driver',
    dayRate: 2200,
    addonRatePerHour: 150,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'r2',
    vehicleType: '7seater',
    vehicleName: '7-Seater SUV / Ertiga (AC)',
    capacity: '6 Passengers + Driver',
    dayRate: 3400,
    addonRatePerHour: 220,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'r3',
    vehicleType: '4x4jeep',
    vehicleName: '4x4 Jeep Offroader',
    capacity: '5 Passengers + Driver',
    dayRate: 4500,
    addonRatePerHour: 350,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'r4',
    vehicleType: 'auto',
    vehicleName: 'Auto Rickshaw',
    capacity: '3 Passengers',
    dayRate: 1200,
    addonRatePerHour: 100,
    image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=400&q=80',
  }
];

export const initialGuideRates: GuideRateConfig[] = [
  {
    id: 'gr1',
    category: 'Heritage & History Expert',
    description: 'Specialized historical tour guide for UNESCO sites, temples & palaces',
    dayRate: 2500,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'gr2',
    category: 'Nature & Trekking Guide',
    description: 'Certified wilderness guide for forest trails, jungle safari & trekking',
    dayRate: 2200,
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'gr3',
    category: 'City & Culture Explorer',
    description: 'Local cultural storyteller for food walks, shopping & city sight-seeing',
    dayRate: 1800,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  }
];

export const getDashboardStats = (customersCount: number, driversCount: number, guidesCount: number): DashboardStats => {
  return {
    totalCustomers: customersCount,
    totalDrivers: driversCount,
    totalGuides: guidesCount,
    totalRevenue: 284500,
    activeBookings: 18,
    revenueTrend: [
      { month: 'Jan', revenue: 24000, trips: 45 },
      { month: 'Feb', revenue: 32000, trips: 62 },
      { month: 'Mar', revenue: 41000, trips: 78 },
      { month: 'Apr', revenue: 38000, trips: 70 },
      { month: 'May', revenue: 52000, trips: 95 },
      { month: 'Jun', revenue: 45000, trips: 84 },
      { month: 'Jul', revenue: 52500, trips: 102 },
    ],
    recentActivities: [
      { id: 'a1', type: 'kyc_pending', user: 'Amit Singh (Driver)', detail: 'Uploaded 5 KYC documents & 4 vehicle photos', time: '10 mins ago' },
      { id: 'a2', type: 'registration', user: 'Anjali Hegde (Guide)', detail: 'Registered as a Guide profile', time: '1 hour ago' },
      { id: 'a3', type: 'trip_completed', user: 'Nikitha Rao', detail: 'Completed Airport Cab trip ₹1,200', time: '3 hours ago' },
      { id: 'a4', type: 'kyc_pending', user: 'Suresh Kumar', detail: 'Admin verified KYC documents', time: 'Yesterday' },
    ]
  };
};

export async function fetchCustomersApi(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/customers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.customers)) {
      const dbCustomers: Customer[] = data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || `${c.phone}@vibzz.com`,
        status: c.status || 'Active',
        dateJoined: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '2026-07-20',
        walletBalance: 0,
        totalSpent: 0,
        totalTripsCount: 0,
        recentTrips: []
      }));
      // Filter duplicates by phone
      const combined = [...dbCustomers];
      initialCustomers.forEach(ic => {
        if (!combined.some(c => c.phone === ic.phone)) combined.push(ic);
      });
      return combined;
    }
  } catch (e) {
    console.warn('Error fetching backend customers, using mock:', e);
  }
  return initialCustomers;
}

export async function fetchDriversApi(): Promise<Driver[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.drivers)) {
      const dbDrivers: Driver[] = data.drivers.map((d: any) => ({
        id: d.user_id,
        name: d.name,
        phone: d.phone,
        email: d.email || undefined,
        vehicleType: d.vehicle_type || '5seater',
        vehicleModel: d.vehicle_model || 'Standard Cab',
        vehicleNumber: d.vehicle_number || 'KA-01-EX-0000',
        licenseNumber: d.license_number || 'DL-00000000',
        status: d.status || 'Pending KYC',
        rating: Number(d.rating) || 5.0,
        walletBalance: Number(d.wallet_balance) || 0,
        dateRegistered: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : '2026-07-20',
        dailyRate: Number(d.daily_rate) || 2500,
        hourlyAddonRate: Number(d.hourly_addon_rate) || 200,
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
      const combined = [...dbDrivers];
      initialDrivers.forEach(id => {
        if (!combined.some(d => d.phone === id.phone)) combined.push(id);
      });
      return combined;
    }
  } catch (e) {
    console.warn('Error fetching backend drivers, using mock:', e);
  }
  return initialDrivers;
}

export async function fetchGuidesApi(): Promise<Guide[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guides`);
    const data = await res.json();
    if (data.success && Array.isArray(data.guides)) {
      const dbGuides: Guide[] = data.guides.map((g: any) => ({
        id: g.user_id,
        name: g.name,
        phone: g.phone,
        email: g.email || undefined,
        expertise: g.expertise || 'General Tour Guide',
        licenseId: g.license_id || 'KA-GUIDE-TEMP',
        bio: g.bio || 'Tour guide profile',
        status: g.status || 'Pending KYC',
        rating: Number(g.rating) || 5.0,
        walletBalance: Number(g.wallet_balance) || 0,
        dateRegistered: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : '2026-07-20',
        dailyRate: Number(g.daily_rate) || 2000,
        documents: {
          photo: g.photo_url || null,
          licenseCert: g.license_cert_url || null,
          idProof: g.id_proof_url || null,
        }
      }));
      const combined = [...dbGuides];
      initialGuides.forEach(ig => {
        if (!combined.some(g => g.phone === ig.phone)) combined.push(ig);
      });
      return combined;
    }
  } catch (e) {
    console.warn('Error fetching backend guides, using mock:', e);
  }
  return initialGuides;
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

export async function updateDriverRateApi(userId: string, dailyRate: number, hourlyAddonRate: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/drivers/${userId}/rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_rate: dailyRate, hourly_addon_rate: hourlyAddonRate }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error updating driver rate on backend:', e);
    return false;
  }
}

export async function updateGuideRateApi(userId: string, dailyRate: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guides/${userId}/rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_rate: dailyRate }),
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

export const initialDestinations: Destination[] = [
  {
    id: 'dest-1',
    name: 'Hampi Heritage Valley',
    description: 'Ancient capital of the Vijayanagara Empire featuring monolithic monuments and boulder hillscapes.',
    location: 'Vijayanagara, Karnataka',
    imageUrl: 'https://images.unsplash.com/photo-1600100397608-f090742f40eb?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    checkpoints: [
      {
        id: 'cp-1',
        destinationId: 'dest-1',
        name: 'Virupaksha Temple',
        description: '7th century functional temple complex dedicated to Lord Shiva with a majestic 160ft gopuram.',
        images: [
          'https://images.unsplash.com/photo-1600100397608-f090742f40eb?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [
          'https://www.w3schools.com/html/mov_bbb.mp4'
        ],
        isActive: true,
        orderIndex: 1
      },
      {
        id: 'cp-2',
        destinationId: 'dest-1',
        name: 'Vittala Temple & Stone Chariot',
        description: 'World-famous UNESCO monument featuring 56 musical pillars and iconic carved stone chariot.',
        images: [
          'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [
          'https://www.w3schools.com/html/mov_bbb.mp4'
        ],
        isActive: true,
        orderIndex: 2
      },
      {
        id: 'cp-3',
        destinationId: 'dest-1',
        name: 'Hemakuta Hill Sunset Point',
        description: 'Panoramas of ancient granite temples nestled on hilltop rocks overlooking banana plantations.',
        images: [
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [],
        isActive: true,
        orderIndex: 3
      }
    ]
  },
  {
    id: 'dest-2',
    name: 'Gokarna Coastal Trail',
    description: 'Pristine beaches, cliffside walking tracks, and sacred ancient temple shrines.',
    location: 'Uttara Kannada, Karnataka',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    checkpoints: [
      {
        id: 'cp-4',
        destinationId: 'dest-2',
        name: 'Om Beach',
        description: 'Naturally formed beach in the shape of the sacred Om symbol with water sports and beach cafes.',
        images: [
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [
          'https://www.w3schools.com/html/mov_bbb.mp4'
        ],
        isActive: true,
        orderIndex: 1
      },
      {
        id: 'cp-5',
        destinationId: 'dest-2',
        name: 'Kudle Beach Sunset Cove',
        description: 'Secluded crescent bay famous for relaxing sunset walks and seaside dining.',
        images: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [],
        isActive: true,
        orderIndex: 2
      }
    ]
  },
  {
    id: 'dest-3',
    name: 'Coorg Highland Reserve',
    description: 'Rolling hills, aroma of coffee blossoms, misty waterfalls, and elephant conservation reserves.',
    location: 'Kodagu, Karnataka',
    imageUrl: 'https://images.unsplash.com/photo-1511497584788-876761c13906?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    checkpoints: [
      {
        id: 'cp-6',
        destinationId: 'dest-3',
        name: 'Abbey Falls Cascade',
        description: 'Tumbling waterfall surrounded by private spice plantations and hanging bridge view.',
        images: [
          'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [],
        isActive: true,
        orderIndex: 1
      },
      {
        id: 'cp-7',
        destinationId: 'dest-3',
        name: "Raja's Seat Viewpoint",
        description: 'Historic garden amphitheater offering views of valley horizons and sunset clouds.',
        images: [
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
        ],
        videos: [],
        isActive: true,
        orderIndex: 2
      }
    ]
  }
];

export const initialPlans: Plan[] = [
  {
    id: 'plan-1',
    name: 'Hampi 2-Day Heritage Express',
    description: 'Complete guided tour of Vijayanagara empire monuments, royal enclosures, and sunset viewpoints.',
    km: 180,
    duration: '2 Days / 1 Night',
    price: 4999,
    isActive: true,
    checkpoints: [
      {
        planCheckpointId: 'pc-1',
        checkpointId: 'cp-1',
        destinationId: 'dest-1',
        destinationName: 'Hampi Heritage Valley',
        name: 'Virupaksha Temple',
        description: '7th century functional temple complex dedicated to Lord Shiva with a majestic 160ft gopuram.',
        images: ['https://images.unsplash.com/photo-1600100397608-f090742f40eb?auto=format&fit=crop&w=800&q=80'],
        videos: ['https://www.w3schools.com/html/mov_bbb.mp4'],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 1
      },
      {
        planCheckpointId: 'pc-2',
        checkpointId: 'cp-2',
        destinationId: 'dest-1',
        destinationName: 'Hampi Heritage Valley',
        name: 'Vittala Temple & Stone Chariot',
        description: 'World-famous UNESCO monument featuring 56 musical pillars and iconic carved stone chariot.',
        images: ['https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80'],
        videos: ['https://www.w3schools.com/html/mov_bbb.mp4'],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 2
      },
      {
        planCheckpointId: 'pc-3',
        checkpointId: 'cp-3',
        destinationId: 'dest-1',
        destinationName: 'Hampi Heritage Valley',
        name: 'Hemakuta Hill Sunset Point',
        description: 'Panoramas of ancient granite temples nestled on hilltop rocks overlooking banana plantations.',
        images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'],
        videos: [],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 3
      }
    ]
  },
  {
    id: 'plan-2',
    name: 'Gokarna 3-Day Beach & Trail Retreat',
    description: 'Coastal cliff treks, sunset chillouts, and temple visits across Gokarna’s famous beaches.',
    km: 240,
    duration: '3 Days / 2 Nights',
    price: 6800,
    isActive: true,
    checkpoints: [
      {
        planCheckpointId: 'pc-4',
        checkpointId: 'cp-4',
        destinationId: 'dest-2',
        destinationName: 'Gokarna Coastal Trail',
        name: 'Om Beach',
        description: 'Naturally formed beach in the shape of the sacred Om symbol with water sports and beach cafes.',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        videos: ['https://www.w3schools.com/html/mov_bbb.mp4'],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 1
      },
      {
        planCheckpointId: 'pc-5',
        checkpointId: 'cp-5',
        destinationId: 'dest-2',
        destinationName: 'Gokarna Coastal Trail',
        name: 'Kudle Beach Sunset Cove',
        description: 'Secluded crescent bay famous for relaxing sunset walks and seaside dining.',
        images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'],
        videos: [],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 2
      }
    ]
  },
  {
    id: 'plan-3',
    name: 'Coorg 2-Day Nature & Waterfall Explorer',
    description: 'Coffee plantation walking tour, mist-shrouded waterfall visits, and mountain viewpoint stops.',
    km: 150,
    duration: '2 Days / 1 Night',
    price: 5500,
    isActive: true,
    checkpoints: [
      {
        planCheckpointId: 'pc-6',
        checkpointId: 'cp-6',
        destinationId: 'dest-3',
        destinationName: 'Coorg Highland Reserve',
        name: 'Abbey Falls Cascade',
        description: 'Tumbling waterfall surrounded by private spice plantations and hanging bridge view.',
        images: ['https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80'],
        videos: [],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 1
      },
      {
        planCheckpointId: 'pc-7',
        checkpointId: 'cp-7',
        destinationId: 'dest-3',
        destinationName: 'Coorg Highland Reserve',
        name: "Raja's Seat Viewpoint",
        description: 'Historic garden amphitheater offering views of valley horizons and sunset clouds.',
        images: ['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'],
        videos: [],
        isMasterActive: true,
        isActiveInPlan: true,
        orderIndex: 2
      }
    ]
  }
];

// ==========================================
// API HELPER FUNCTIONS FOR DESTINATIONS & PLANS
// ==========================================

export async function fetchDestinationsApi(): Promise<Destination[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching destinations from backend, using mock:', e);
  }
  return initialDestinations;
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
    console.warn('Error toggling destination on backend:', e);
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

export async function addCheckpointApi(destinationId: string, payload: Partial<Checkpoint>): Promise<Checkpoint | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/${destinationId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error adding checkpoint on backend:', e);
  }
  return null;
}

export async function updateCheckpointApi(checkpointId: string, payload: Partial<Checkpoint>): Promise<Checkpoint | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/checkpoints/${checkpointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) return data.data;
  } catch (e) {
    console.warn('Error updating checkpoint on backend:', e);
  }
  return null;
}

export async function toggleCheckpointStatusApi(checkpointId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/checkpoints/${checkpointId}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error toggling checkpoint status on backend:', e);
    return false;
  }
}

export async function deleteCheckpointApi(checkpointId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/destinations/checkpoints/${checkpointId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error deleting checkpoint on backend:', e);
    return false;
  }
}

export async function fetchPlansApi(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
  } catch (e) {
    console.warn('Error fetching plans from backend, using mock:', e);
  }
  return initialPlans;
}

export async function createPlanApi(payload: { name: string; description: string; km: number; duration: string; price: number; checkpointIds: string[] }): Promise<Plan | null> {
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

export async function addPlanCheckpointApi(planId: string, checkpointId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpointId }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error adding checkpoint to plan on backend:', e);
    return false;
  }
}

export async function togglePlanCheckpointApi(planId: string, checkpointId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/checkpoints/${checkpointId}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error toggling checkpoint in plan on backend:', e);
    return false;
  }
}

export async function deletePlanCheckpointApi(planId: string, checkpointId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/checkpoints/${checkpointId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.warn('Error removing checkpoint from plan on backend:', e);
    return false;
  }
}

