import { Customer, Driver, Guide, DriverRateConfig, GuideRateConfig, DashboardStats } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vibe-backend-tlaw.onrender.com';

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
