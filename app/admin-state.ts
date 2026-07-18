export interface Driver {
  id: string;
  name: string;
  username: string;
  phone: string;
  vehicle: string;
  status: 'Active' | 'Inactive' | 'Pending KYC' | 'KYC Declined';
  kycDone: boolean;
}

export interface Guide {
  id: string;
  name: string;
  username: string;
  phone: string;
  expertise: string;
  status: 'Active' | 'Inactive' | 'Pending KYC' | 'KYC Declined';
  kycDone: boolean;
}

export interface TripRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip' | 'plan';
  vehicleType?: string;
  title: string;
  route?: string[];
  driverOrGuideName: string;
  date: string;
  time: string;
  price: number;
  paymentMode: 'UPI' | 'Cash';
  status: 'Completed' | 'Upcoming' | 'Cancelled';
  rating?: number;
  passengerCount?: number;
}

export interface CustomTripRequest {
  id: string;
  checkpoints: { name: string; latitude: number; longitude: number }[];
  status: 'Pending' | 'Quoted' | 'Booked';
  vehicle: string;
  quotedPrice?: number;
  touristName: string;
  bookingType?: 'spot' | 'prebook';
  date?: string;
  time?: string;
}

export interface AdvanceBooking {
  id: string;
  type: 'cab' | 'guide';
  title: string;
  route: string[];
  date: string;
  time: string;
  price: number;
  driverOrGuideName?: string;
  assignedToId?: string;
  touristName: string;
  bookingDate: string;
  status: 'Pending' | 'Accepted' | 'Cancelled';
}

export const adminState = {
  drivers: [
    { id: 'd1', name: 'Suresh Kumar', username: 'suresh', phone: '9876543210', vehicle: '5 Seater Premium', status: 'Active' as const, kycDone: true },
    { id: 'd2', name: 'Raju Auto', username: 'raju', phone: '9123456789', vehicle: 'Eco Auto', status: 'Active' as const, kycDone: true },
    { id: 'd3', name: 'Amit Singh', username: 'amit', phone: '9888877776', vehicle: '7 Seater Spacious', status: 'Pending KYC' as const, kycDone: false },
    { id: 'd4', name: 'Vikram Gowda', username: 'vikram', phone: '9444455555', vehicle: '4x4 Jeep Offroader', status: 'Inactive' as const, kycDone: true },
  ],
  guides: [
    { id: 'g1', name: 'Krishna Murthy', username: 'krishna', phone: '8765432109', expertise: 'History & Heritage Walks', status: 'Active' as const, kycDone: true },
    { id: 'g2', name: 'Ramesh Gowda', username: 'ramesh', phone: '8123456780', expertise: 'Nature Trails & Trekking', status: 'Active' as const, kycDone: true },
    { id: 'g3', name: 'Anjali Hegde', username: 'anjali', phone: '8999900001', expertise: 'Food & Local Culture Tours', status: 'Pending KYC' as const, kycDone: false },
  ],
  userTrips: [] as TripRecord[],
  customTripRequests: [] as CustomTripRequest[],
  advanceBookings: [
    {
      id: 'adv1',
      type: 'cab',
      title: 'Majestic ➔ Bengaluru Palace',
      route: ['Majestic Station', 'Bengaluru Palace'],
      date: '2026-07-25',
      time: '10:00 AM',
      price: 450,
      touristName: 'Nikitha (Tourist)',
      bookingDate: '2026-07-16',
      status: 'Pending',
    },
    {
      id: 'adv2',
      type: 'guide',
      title: 'Hampi Virupaksha Heritage Guided Tour',
      route: ['Hampi Virupaksha Temple'],
      date: '2026-07-28',
      time: '09:00 AM',
      price: 2500,
      touristName: 'John Doe',
      bookingDate: '2026-07-15',
      status: 'Pending',
    }
  ] as AdvanceBooking[],
  vehicleRatesPerHour: {
    '5seater': 150,
    '7seater': 220,
    '4x4jeep': 350,
    'auto': 100,
  },
};
