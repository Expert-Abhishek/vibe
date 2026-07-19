import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from './admin-state';

interface SubCar {
  name: string;
  image: string;
  pax: number;
  boot: string;
  rate: number;
  ac: boolean;
  desc: string;
}

interface CategoryInfo {
  key: string;
  label: string;
  icon: string;
  cars: SubCar[];
}

const fleetData: CategoryInfo[] = [
  {
    key: '5seater',
    label: '5 Seater',
    icon: 'car',
    cars: [
      {
        name: 'Maruti Suzuki Swift',
        image: 'https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=400',
        pax: 5,
        boot: '268L (1 Large Bag)',
        rate: 12,
        ac: true,
        desc: 'Highly fuel-efficient, reliable, and swift city commuter. Ideal for short-to-medium trips.',
      },
      {
        name: 'Maruti Suzuki WagonR',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
        pax: 5,
        boot: '341L (1 Large Bag)',
        rate: 10,
        ac: true,
        desc: 'Tall-boy design offering excellent headroom and spacious cabin space for local travels.',
      },
      {
        name: 'Hyundai i20 Premium',
        image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400',
        pax: 5,
        boot: '311L (1 Large Bag)',
        rate: 14,
        ac: true,
        desc: 'Premium hatchback experience with superior comfort, modern styling, and silent ride quality.',
      },
    ],
  },
  {
    key: '7seater',
    label: '7 Seater',
    icon: 'users',
    cars: [
      {
        name: 'Toyota Innova Crysta',
        image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400',
        pax: 7,
        boot: '600L (3 Large Bags)',
        rate: 22,
        ac: true,
        desc: 'The ultimate king of highway travel. Unmatched comfort, dual-zone AC, and premium captains seats.',
      },
      {
        name: 'Maruti Suzuki Ertiga',
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
        pax: 7,
        boot: '550L (2 Large Bags)',
        rate: 17,
        ac: true,
        desc: 'Most popular pocket-friendly multi-purpose vehicle for larger family getaways.',
      },
    ],
  },
  {
    key: '4x4jeep',
    label: '4x4 Jeep',
    icon: 'mountain',
    cars: [
      {
        name: 'Mahindra Thar 4×4',
        image: 'https://images.unsplash.com/photo-1533560224820-f3861a479916?w=400',
        pax: 4,
        boot: '150L (1 Medium Bag)',
        rate: 35,
        ac: true,
        desc: 'Sleek off-road machinery. High ground clearance, solid 4WD traction, and perfect view for Western Ghats adventures.',
      },
    ],
  },
  {
    key: 'auto',
    label: 'Eco Auto',
    icon: 'motorcycle',
    cars: [
      {
        name: 'Bajaj RE Auto Rickshaw',
        image: 'https://images.unsplash.com/photo-1566371486490-560ded23b5e4?w=400',
        pax: 3,
        boot: '50L (1 Small Handbag)',
        rate: 10,
        ac: false,
        desc: 'Traditional open-air local commuter. Extremely agile inside city streets and narrow tourist lanes.',
      },
    ],
  },
];

export default function FleetCatalogScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const initialRide = searchParams.selectedRide as string || '4x4jeep';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<string>(initialRide);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const currentCategory = fleetData.find(cat => cat.key === activeTab) || fleetData[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vehicle Fleet Showcase</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Categories Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {fleetData.map((cat) => {
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
          <Text style={styles.introTitle}>Choose Your Comfort</Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>
            Browse our verified local fleet. Standard ride bookings are configured hourly inside your custom itinerary builder.
          </Text>
        </View>

        {/* Fleet List Rows */}
        {currentCategory.cars.map((car, idx) => {
          const ratePerHour = adminState.vehicleRatesPerHour[currentCategory.key as keyof typeof adminState.vehicleRatesPerHour] || car.rate * 10;
          const ratePerDay = currentCategory.key === '5seater' ? 1800 : currentCategory.key === '7seater' ? 2600 : currentCategory.key === '4x4jeep' ? 4200 : 1200;

          return (
            <View key={idx} style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: scale(14),
              padding: scale(12),
              marginBottom: verticalScale(12),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: car.image }} style={{ width: scale(76), height: scale(76), borderRadius: scale(10) }} />
                
                <View style={{ flex: 1, marginLeft: scale(12), justifyContent: 'center' }}>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14.5), fontWeight: '800' }}>{car.name}</Text>
                  
                  <View style={{ flexDirection: 'row', gap: scale(8), marginVertical: verticalScale(4) }}>
                    <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted }}>👥 {car.pax} Seats</Text>
                    <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted }}>💼 {car.boot.split(' ')[0]}</Text>
                  </View>

                  <Text style={{ color: colors.amber, fontSize: moderateFontScale(13), fontWeight: '800' }}>
                    ₹{ratePerDay}/Day <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), fontWeight: 'normal' }}>(+ ₹{ratePerHour}/hr addon)</Text>
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: verticalScale(8), lineHeight: moderateFontScale(15) }}>
                {car.desc}
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.amber,
                  borderRadius: scale(10),
                  height: scale(36),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: verticalScale(10),
                }}
                onPress={() => {
                  router.push({
                    pathname: '/plan-route',
                    params: {
                      fromVehicle: 'true',
                      vehicleType: currentCategory.key,
                      carName: car.name
                    }
                  });
                }}
              >
                <Text style={{ color: '#101014', fontWeight: '800', fontSize: moderateFontScale(12) }}>
                  Book Package with this Car
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: verticalScale(30) }} />
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
    borderBottomWidth: 2,
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
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    color: '#F5C518',
  },
  introSub: {
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(4),
    lineHeight: moderateFontScale(18),
  },
  carCard: {
    borderRadius: scale(22),
    padding: scale(16),
    marginBottom: verticalScale(20),
    borderWidth: 1.2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carName: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  carStatusText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  fareInfo: {
    alignItems: 'flex-end',
  },
  farePrice: {
    color: '#F5C518',
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  fareUnit: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
  },
  imageBlock: {
    height: verticalScale(130),
    width: '100%',
    borderRadius: scale(14),
    overflow: 'hidden',
    marginVertical: verticalScale(12),
  },
  carVisualImage: {
    width: '100%',
    height: '100%',
  },
  specsBar: {
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    paddingVertical: verticalScale(10),
    marginVertical: verticalScale(4),
    justifyContent: 'space-between',
  },
  specBox: {
    flex: 1,
    alignItems: 'center',
  },
  specVal: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  specLbl: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  barDivider: {
    width: 1.2,
    height: '70%',
    alignSelf: 'center',
  },
  carDescText: {
    fontSize: moderateFontScale(12.5),
    lineHeight: moderateFontScale(18),
    marginVertical: verticalScale(6),
  },
  bookButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(42),
    marginTop: verticalScale(8),
    gap: scale(6),
  },
  bookButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
});
