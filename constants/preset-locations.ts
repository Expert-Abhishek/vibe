export interface PresetLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon?: string;
}

export const PRESET_PICKUP_DROP_LOCATIONS: PresetLocation[] = [
  {
    id: 'loc_ksrtc_bus_stand',
    name: 'KSRTC Bus Stand Sakleshpur',
    address: 'Sakleshpura, Karnataka 573134',
    latitude: 12.9416,
    longitude: 75.7790,
    icon: 'directions-bus',
  },
  {
    id: 'loc_sakleshpur_town',
    name: 'Sakleshpur Town Center',
    address: 'Main Road, Sakleshpur, Karnataka 573134',
    latitude: 12.9455178,
    longitude: 75.7789167,
    icon: 'location-city',
  },
  {
    id: 'loc_azad_road_junction',
    name: 'Azad Road Junction (Sakleshpur)',
    address: 'Azad Road, Sakleshpur, Karnataka 573134',
    latitude: 12.9403832,
    longitude: 75.7789866,
    icon: 'traffic',
  },
  {
    id: 'loc_ksrtc_old_bus_stand_ballupet',
    name: 'KSRTC Old Bus Stand Ballupet',
    address: 'J.P Nagar, Ballupet, Sakleshpura, Karnataka 573134',
    latitude: 12.9155,
    longitude: 75.8456,
    icon: 'departure-board',
  },
];
