export interface PresetLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon?: string;
  mapUrl?: string;
}

export const PRESET_PICKUP_DROP_LOCATIONS: PresetLocation[] = [
  {
    id: 'loc_ksrtc_bus_stand',
    name: 'KSRTC BUS STAND Sakaleshpura',
    address: 'BM Road, Sakaleshpura, Karnataka 573134',
    latitude: 12.9723,
    longitude: 75.7865,
    icon: 'directions-bus',
    mapUrl: 'https://maps.app.goo.gl/AvFm6pUXd3XCMGF29?g_st=aw',
  },
  {
    id: 'loc_sakaleshpura_main_city',
    name: 'Sakaleshpura Main City',
    address: 'Main City Market, Sakaleshpura, Karnataka 573134',
    latitude: 12.9730,
    longitude: 75.7845,
    icon: 'location-city',
    mapUrl: 'https://maps.app.goo.gl/SBpmas6PU2kUhqP47?g_st=aw',
  },
  {
    id: 'loc_sakaleshpura_city',
    name: 'Sakaleshpura City',
    address: 'Town Circle, Sakaleshpura, Karnataka 573134',
    latitude: 12.9700,
    longitude: 75.7820,
    icon: 'storefront',
    mapUrl: 'https://maps.app.goo.gl/LKC4JmKfPjvgPaHh7?g_st=aw',
  },
  {
    id: 'loc_railway_station_sakaleshpura',
    name: 'Railway Station Sakaleshpura',
    address: 'Railway Station Road, Sakaleshpura, Karnataka 573134',
    latitude: 12.9740,
    longitude: 75.7890,
    icon: 'train',
    mapUrl: 'https://maps.app.goo.gl/SYeGVrG5qoXi4niN8?g_st=aw',
  },
];
