import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchDriversApi } from '@/constants/api';
import { adminState } from './admin-state';

interface CategoryInfo {
  key: string;
  label: string;
  pax: number;
}

const categories: CategoryInfo[] = [
  { key: '5seater', label: '5 Seater', pax: 5 },
  { key: '7seater', label: '7 Seater', pax: 7 },
  { key: '4x4jeep', label: '4x4 Off-Road', pax: 4 },
  { key: 'auto', label: 'Eco Auto', pax: 3 },
];

export default function FleetCatalogScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  
  const initialRide = (searchParams.selectedRide as string) || '5seater';
  const mode = (searchParams.mode as string) || 'custom_trip'; // 'custom_trip' | 'plan'
  const planId = (searchParams.planId as string) || '';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<string>(initialRide);

  const [driversList, setDriversList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDrivers() {
      setLoading(true);
      try {
        const drivers = await fetchDriversApi();
        if (isMounted) {
          setDriversList(drivers || []);
        }
      } catch (err) {
        console.warn('Error fetching drivers for fleet showcase:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDrivers();
    return () => { isMounted = false; };
  }, []);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  // Filter backend drivers for selected category
  const categoryDrivers = driversList.filter((d: any) => {
    const dType = (d.vehicle_type || d.vehicleType || '5seater').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sel = activeTab.toLowerCase().replace(/[^a-z0-9]/g, '');
    return dType === sel || (sel === '4x4jeep' && (dType.includes('4x4') || dType.includes('jeep')));
  });

  // Fallback demo fleet items if no drivers registered yet in DB
  const defaultFallbackFleet: Record<string, any[]> = {
    '5seater': [
      {
        id: 'demo_5s_1',
        name: 'Verified Cab Driver',
        vehicle_model: 'Maruti Swift Dzire (AC)',
        vehicle_number: 'KA-01-EX-1008',
        daily_rate: 1800,
        hourly_addon_rate: 150,
        car_front_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'demo_5s_2',
        name: 'Verified Cab Driver',
        vehicle_model: 'Hyundai i20 Premium (AC)',
        vehicle_number: 'KA-04-MY-2020',
        daily_rate: 2000,
        hourly_addon_rate: 150,
        car_front_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=600&q=80',
      }
    ],
    '7seater': [
      {
        id: 'demo_7s_1',
        name: 'Verified Cab Driver',
        vehicle_model: 'Toyota Innova Crysta (AC)',
        vehicle_number: 'KA-05-EX-7788',
        daily_rate: 2800,
        hourly_addon_rate: 200,
        car_front_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80',
      }
    ],
    '4x4jeep': [
      {
        id: 'demo_4x4_1',
        name: 'Verified Offroad Driver',
        vehicle_model: 'Mahindra Thar 4x4 (AC)',
        vehicle_number: 'KA-36-THAR-4x4',
        daily_rate: 4200,
        hourly_addon_rate: 350,
        car_front_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      }
    ],
    'auto': [
      {
        id: 'demo_auto_1',
        name: 'Local Auto Driver',
        vehicle_model: 'Bajaj RE Auto Rickshaw',
        vehicle_number: 'KA-36-AUTO-01',
        daily_rate: 1200,
        hourly_addon_rate: 100,
        car_front_url: 'https://images.unsplash.com/photo-1566371486490-560ded23b5e4?auto=format&fit=crop&w=600&q=80',
      }
    ]
  };

  const displayDrivers = categoryDrivers.length > 0
    ? categoryDrivers
    : (defaultFallbackFleet[activeTab] || defaultFallbackFleet['5seater']);

  const handleSelectCar = (driver: any) => {
    const carModel = driver.vehicle_model || driver.name || 'Standard Cab';
    const dayRate = driver.daily_rate ? Number(driver.daily_rate) : 1800;
    const hrAddonRate = driver.hourly_addon_rate ? Number(driver.hourly_addon_rate) : 150;
    const carPhoto = driver.car_front_url || driver.photo_url || '';
    const driverName = driver.name || 'Verified Driver';
    const vehicleNo = driver.vehicle_number || '';
    const driverId = driver.user_id || driver.id || '';

    if (mode === 'plan') {
      router.push({
        pathname: '/plan-route',
        params: {
          fromVehicle: 'true',
          selectedRide: activeTab,
          selectedDriverId: driverId,
          selectedDriverName: driverName,
          selectedCarModel: carModel,
          selectedCarNumber: vehicleNo,
          selectedCarPhoto: carPhoto,
          selectedDriverRate: dayRate,
          selectedDriverAddonRate: hrAddonRate,
          selectedPlanId: planId,
        }
      });
    } else {
      router.push({
        pathname: '/make-trip',
        params: {
          fromVehicle: 'true',
          selectedRide: activeTab,
          selectedDriverId: driverId,
          selectedDriverName: driverName,
          selectedCarModel: carModel,
          selectedCarNumber: vehicleNo,
          selectedCarPhoto: carPhoto,
          selectedDriverRate: dayRate,
          selectedDriverAddonRate: hrAddonRate,
        }
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Vehicle Fleet Showcase
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Categories Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {categories.map((cat) => {
            const isSelected = activeTab === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tabItem, isSelected && { borderBottomColor: colors.amber }]}
                onPress={() => setActiveTab(cat.key)}
              >
                <Text style={[styles.tabItemText, { color: isSelected ? colors.amber : colors.textMuted }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>
            {mode === 'plan' ? 'Select Car for Tour Plan' : 'Select Car for Custom Trip'}
          </Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>
            {mode === 'plan'
              ? 'Vehicle fare is covered in your Plan package. Pick a registered car below. Only extra add-on time (if any) is charged per hour.'
              : 'Browse active registered drivers and cars. Tap to pick a car and calculate your custom trip checkout bill.'}
          </Text>
        </View>

        {loading ? (
          <View style={{ padding: scale(40), alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={{ color: colors.textMuted, marginTop: verticalScale(10), fontSize: moderateFontScale(12) }}>
              Loading registered cars & driver fleet...
            </Text>
          </View>
        ) : (
          <View style={{ gap: verticalScale(14) }}>
            {displayDrivers.map((driver: any, idx: number) => {
              const frontPic = driver.car_front_url || driver.photo_url;
              const dayRate = driver.daily_rate ? Number(driver.daily_rate) : 1800;
              const hrRate = driver.hourly_addon_rate ? Number(driver.hourly_addon_rate) : 150;
              const carModel = driver.vehicle_model || driver.name || 'Standard Cab';
              const driverName = driver.name || 'Registered Partner';
              const vehicleNo = driver.vehicle_number || 'Registered';

              return (
                <View
                  key={driver.id || `fleet_${idx}`}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    borderRadius: scale(16),
                    padding: scale(14),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Car Image Thumbnail */}
                    <View
                      style={{
                        width: scale(84),
                        height: scale(84),
                        borderRadius: scale(12),
                        backgroundColor: '#212129',
                        overflow: 'hidden',
                        marginRight: scale(12),
                        borderWidth: 1,
                        borderColor: colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {frontPic && (frontPic.startsWith('http') || frontPic.startsWith('data:image')) ? (
                        <Image source={{ uri: frontPic }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      ) : (
                        <MaterialIcons name="directions-car" size={scale(36)} color={colors.amber} />
                      )}
                    </View>

                    {/* Driver & Car Spec Details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(15), fontWeight: '800', flex: 1 }} numberOfLines={1}>
                          {carModel}
                        </Text>
                      </View>

                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11.5), marginTop: verticalScale(3) }}>
                        Driver: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{driverName}</Text> ({vehicleNo})
                      </Text>

                      {/* Pricing Tag */}
                      <View style={{ marginTop: verticalScale(6) }}>
                        {mode === 'plan' ? (
                          <View>
                            <Text style={{ color: '#10B981', fontSize: moderateFontScale(13), fontWeight: '900' }}>
                              Included in Plan Package
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), marginTop: 1 }}>
                              (+ ₹{hrRate}/hr for extra add-on time)
                            </Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                            <Text style={{ color: colors.amber, fontSize: moderateFontScale(14), fontWeight: '900' }}>
                              ₹{dayRate}/Day
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5) }}>
                              (+ ₹{hrRate}/hr addon)
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Select Car Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.amber,
                      borderRadius: scale(12),
                      height: scale(40),
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: verticalScale(12),
                      flexDirection: 'row',
                      gap: scale(6),
                    }}
                    onPress={() => handleSelectCar(driver)}
                  >
                    <MaterialIcons name="check-circle" size={scale(18)} color="#101014" />
                    <Text style={{ color: '#101014', fontWeight: '900', fontSize: moderateFontScale(13) }}>
                      {mode === 'plan' ? 'Select Car for Tour Plan' : 'Book Car for Custom Trip'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  tabBar: {
    borderBottomWidth: 1.2,
  },
  tabScrollContent: {
    paddingHorizontal: scale(18),
    gap: scale(14),
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    paddingHorizontal: scale(6),
  },
  tabItemText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
  },
  introBlock: {
    marginBottom: verticalScale(16),
  },
  introTitle: {
    fontSize: moderateFontScale(18),
    fontWeight: '800',
    color: '#F5C518',
  },
  introSub: {
    fontSize: moderateFontScale(12.5),
    marginTop: verticalScale(4),
    lineHeight: moderateFontScale(18),
  },
});
