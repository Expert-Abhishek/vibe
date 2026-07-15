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
      {
        name: 'Tata Altroz Gold',
        image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400',
        pax: 5,
        boot: '345L (2 Medium Bags)',
        rate: 13,
        ac: true,
        desc: '5-star safety rated solid build hatchback, ensuring maximum safety and premium legroom.',
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
      {
        name: 'Kia Carens Luxury',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400',
        pax: 7,
        boot: '580L (2 Large Bags)',
        rate: 20,
        ac: true,
        desc: 'Modern lounge design with ambient lighting and roof-mounted blower vents for all seats.',
      },
      {
        name: 'Mahindra Bolero Neo',
        image: 'https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?w=400',
        pax: 7,
        boot: '500L (1 Large Bag)',
        rate: 16,
        ac: true,
        desc: 'Robust metal chassis built to withstand rough village roads and heavy duty load capacity.',
      },
    ],
  },
  {
    key: '4x4jeep',
    label: '4*4 Jeep',
    icon: 'truck-monster',
    cars: [
      {
        name: 'Mahindra Thar 4×4',
        image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400',
        pax: 4,
        boot: '320L (1 Medium Bag)',
        rate: 25,
        ac: true,
        desc: 'Iconic lifestyle offroader. Heavy-duty 4WD torque to conquer hills, streams, and muddy forest tracks.',
      },
      {
        name: 'Force Gurkha Extreme',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
        pax: 4,
        boot: '350L (1 Medium Bag)',
        rate: 24,
        ac: true,
        desc: 'Built specifically for high mountain climbs. Massive ground clearance and snorkel intake.',
      },
      {
        name: 'Maruti Suzuki Jimny',
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
        pax: 4,
        boot: '300L (1 Medium Bag)',
        rate: 22,
        ac: true,
        desc: 'Lightweight compact 4x4. Excellent maneuverability in tight hairpins and narrow mountain pathways.',
      },
      {
        name: 'Jeep Compass Trailhawk 4x4',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
        pax: 5,
        boot: '438L (2 Large Bags)',
        rate: 30,
        ac: true,
        desc: 'Ultra luxury offroader with premium sunroof, electronic terrain management, and high highway speed capabilities.',
      },
    ],
  },
  {
    key: 'auto',
    label: 'Auto',
    icon: 'electric-rickshaw',
    cars: [
      {
        name: 'Bajaj RE Auto Rickshaw',
        image: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=400',
        pax: 3,
        boot: '80L (Handbag/backpack)',
        rate: 8,
        ac: false,
        desc: 'The iconic symbol of Indian city streets. Nimble, airy, and handles tight traffic bottlenecks like a breeze.',
      },
      {
        name: 'Piaggio Ape City',
        image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400',
        pax: 3,
        boot: '90L (1 Small Bag)',
        rate: 7,
        ac: false,
        desc: 'Slightly wider cabin seating for extra passenger comfort during short temple town commutes.',
      },
      {
        name: 'Mahindra Treo Electric',
        image: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=400',
        pax: 3,
        boot: '85L (Handbag/backpack)',
        rate: 6,
        ac: false,
        desc: 'Eco-friendly, completely silent electric auto rickshaw. Smooth vibration-free local tour travels.',
      },
    ],
  },
];

export default function CarsListScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (searchParams.selectedRide) {
      const match = fleetData.find(cat => cat.key === searchParams.selectedRide);
      if (match) return match.key;
    }
    return '5seater';
  });

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

  const handleBookCar = (carCategoryKey: string) => {
    router.push({
      pathname: '/make-trip',
      params: { selectedRide: carCategoryKey }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Choose Vehicle Spec</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Category Tabs list */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {fleetData.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: colors.amber }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                {tab.icon === 'electric-rickshaw' ? (
                  <MaterialIcons name="electric-rickshaw" size={scale(14)} color={isActive ? colors.amber : colors.textMuted} style={{ marginRight: scale(6) }} />
                ) : (
                  <FontAwesome5 name={tab.icon} size={scale(12)} color={isActive ? colors.amber : colors.textMuted} style={{ marginRight: scale(6) }} />
                )}
                <Text style={[styles.tabItemText, isActive ? { color: colors.amber, fontWeight: '800' } : { color: colors.textMuted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro specifications bar */}
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Drivers Fleet: {currentCategory.label} Cars</Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>
            Review luggage allowances, passenger capacities, and models driving in Karnataka matching your choice.
          </Text>
        </View>

        {/* Cars list of active Category tab */}
        {currentCategory.cars.map((car, idx) => (
          <View
            key={idx}
            style={[
              styles.carCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Top Row: Name and Rate */}
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 0.7 }}>
                <Text style={[styles.carName, { color: colors.textPrimary }]} numberOfLines={1}>{car.name}</Text>
                <Text style={[styles.carStatusText, { color: colors.amber }]}>★ Certified Driver Vehicle</Text>
              </View>
              <View style={styles.fareInfo}>
                <Text style={styles.farePrice}>₹{car.rate}/km</Text>
                <Text style={[styles.fareUnit, { color: colors.textMuted }]}>estimate</Text>
              </View>
            </View>

            {/* Visual Unsplash Image */}
            <View style={styles.imageBlock}>
              <Image source={{ uri: car.image }} style={styles.carVisualImage} resizeMode="cover" />
            </View>

            {/* Specifications Bar metrics */}
            <View style={[styles.specsBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
              {/* Capacity */}
              <View style={styles.specBox}>
                <FontAwesome5 name="users" size={scale(13)} color={colors.textMuted} />
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>{car.pax} Passengers</Text>
                <Text style={[styles.specLbl, { color: colors.textMuted }]}>Capacity</Text>
              </View>

              <View style={[styles.barDivider, { backgroundColor: colors.border }]} />

              {/* Boot space */}
              <View style={styles.specBox}>
                <FontAwesome5 name="suitcase" size={scale(13)} color={colors.textMuted} />
                <Text style={[styles.specVal, { color: colors.textPrimary }]} numberOfLines={1}>{car.boot.split(' ')[0]}</Text>
                <Text style={[styles.specLbl, { color: colors.textMuted }]}>{car.boot.includes('Bag') ? 'Luggage Space' : 'Boot Space'}</Text>
              </View>

              <View style={[styles.barDivider, { backgroundColor: colors.border }]} />

              {/* AC Comfort status */}
              <View style={styles.specBox}>
                <MaterialIcons name={car.ac ? 'ac-unit' : 'do-not-distrust'} size={scale(15)} color={colors.textMuted} />
                <Text style={[styles.specVal, { color: colors.textPrimary }]}>{car.ac ? 'Cabin AC' : 'Non-AC'}</Text>
                <Text style={[styles.specLbl, { color: colors.textMuted }]}>Cabin comfort</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.carDescText, { color: colors.textMuted }]}>{car.desc}</Text>

            {/* Book Now Button */}
            <TouchableOpacity
              style={styles.bookButton}
              activeOpacity={0.8}
              onPress={() => handleBookCar(currentCategory.key)}
            >
              <Text style={styles.bookButtonText}>Book This Car</Text>
              <MaterialIcons name="local-taxi" size={scale(16)} color="#101010" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Space */}
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
