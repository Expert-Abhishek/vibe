import React, { useEffect, useState } from 'react';
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

interface CarSpec {
  key: string;
  name: string;
  desc: string;
  image: any;
  passengerCapacity: number;
  bootSpaceLiters: string;
  ratePerKm: number;
  acAvailable: boolean;
  specialty: string;
}

const carSpecs: CarSpec[] = [
  {
    key: '5seater',
    name: '5 Seater Premium',
    desc: 'Top choice for business travels or family highway trips. Extremely quiet cabin and smooth suspension.',
    image: require('@/assets/images/sedan.png'),
    passengerCapacity: 5,
    bootSpaceLiters: '420L (2 Large bags)',
    ratePerKm: 15,
    acAvailable: true,
    specialty: 'High-speed Highway Stability',
  },
  {
    key: '7seater',
    name: '7 Seater Spacious XL',
    desc: 'Best suited for larger family vacations or group tours. Flexible seating config with high headroom.',
    image: require('@/assets/images/hatch.png'),
    passengerCapacity: 7,
    bootSpaceLiters: '580L (3 Large bags)',
    ratePerKm: 20,
    acAvailable: true,
    specialty: 'Maximum Passenger Comfort',
  },
  {
    key: '4x4jeep',
    name: '4*4 Jeep Offroader',
    desc: 'Tackle the mountain trails of Chikmagalur or misty hairpins of Coorg. Heavy duty torque and rugged design.',
    image: require('@/assets/images/thar.png'),
    passengerCapacity: 4,
    bootSpaceLiters: '320L (1 Medium bag)',
    ratePerKm: 25,
    acAvailable: true,
    specialty: 'All-Terrain Hills & Mud Drive',
  },
  {
    key: 'auto',
    name: 'Eco Auto Rickshaw',
    desc: 'Ideal for local temple town sightseeing, market exploration, or quick city runs through Bangalore traffic.',
    image: require('@/assets/images/auto.png'),
    passengerCapacity: 3,
    bootSpaceLiters: '80L (Handbag/backpack)',
    ratePerKm: 8,
    acAvailable: false,
    specialty: 'Pocket-friendly Short Commutes',
  },
];

export default function CarsListScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [highlightedKey, setHighlightedKey] = useState<string>('');

  useEffect(() => {
    if (searchParams.selectedRide) {
      setHighlightedKey(searchParams.selectedRide as string);
    }
  }, [searchParams]);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const handleBookCar = (carKey: string) => {
    router.push({
      pathname: '/make-trip',
      params: { selectedRide: carKey }
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Choose Your Vehicle</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Vibzz Fleet Specifications</Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>
            Review luggage allowances, passenger limits, and pricing rates to select the perfect ride for your next journey.
          </Text>
        </View>

        {/* Cars List */}
        {carSpecs.map((car) => {
          const isHighlighted = highlightedKey === car.key;
          return (
            <View
              key={car.key}
              style={[
                styles.carCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isHighlighted ? colors.amber : colors.border,
                  borderWidth: isHighlighted ? 1.8 : 1.2,
                },
              ]}
            >
              {/* Highlight Badge */}
              {isHighlighted && (
                <View style={styles.highlightBadge}>
                  <Text style={styles.highlightBadgeText}>Selected Choice</Text>
                </View>
              )}

              {/* Top Row: Name and Rate */}
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.carName, { color: colors.textPrimary }]}>{car.name}</Text>
                  <Text style={[styles.carSpecialty, { color: colors.amber }]}>★ {car.specialty}</Text>
                </View>
                <View style={styles.fareInfo}>
                  <Text style={styles.farePrice}>₹{car.ratePerKm}/km</Text>
                  <Text style={[styles.fareUnit, { color: colors.textMuted }]}>base rate</Text>
                </View>
              </View>

              {/* Car Image Visual cutout */}
              <View style={styles.imageBlock}>
                <Image source={car.image} style={styles.carVisualImage} resizeMode="contain" />
              </View>

              {/* Specs Icons bar */}
              <View style={[styles.specsBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                {/* Passengers */}
                <View style={styles.specBox}>
                  <FontAwesome5 name="users" size={scale(14)} color={colors.textMuted} />
                  <Text style={[styles.specVal, { color: colors.textPrimary }]}>{car.passengerCapacity} Pax</Text>
                  <Text style={[styles.specLbl, { color: colors.textMuted }]}>Capacity</Text>
                </View>

                <View style={[styles.barDivider, { backgroundColor: colors.border }]} />

                {/* Boot space */}
                <View style={styles.specBox}>
                  <FontAwesome5 name="suitcase" size={scale(14)} color={colors.textMuted} />
                  <Text style={[styles.specVal, { color: colors.textPrimary }]} numberOfLines={1}>{car.bootSpaceLiters.split(' ')[0]}</Text>
                  <Text style={[styles.specLbl, { color: colors.textMuted }]}>Boot Space</Text>
                </View>

                <View style={[styles.barDivider, { backgroundColor: colors.border }]} />

                {/* AC Status */}
                <View style={styles.specBox}>
                  <MaterialIcons name={car.acAvailable ? 'ac-unit' : 'do-not-distrust'} size={scale(16)} color={colors.textMuted} />
                  <Text style={[styles.specVal, { color: colors.textPrimary }]}>{car.acAvailable ? 'Available' : 'No AC'}</Text>
                  <Text style={[styles.specLbl, { color: colors.textMuted }]}>AC Filter</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={[styles.carDescText, { color: colors.textMuted }]}>{car.desc}</Text>

              {/* Book Button */}
              <TouchableOpacity
                style={styles.bookButton}
                activeOpacity={0.8}
                onPress={() => handleBookCar(car.key)}
              >
                <Text style={styles.bookButtonText}>Confirm & Plan Trip Route</Text>
                <MaterialIcons name="arrow-forward" size={scale(18)} color="#101010" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Spacing */}
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
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
  },
  introBlock: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  introTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    color: '#F5C518',
    lineHeight: moderateFontScale(28),
  },
  introSub: {
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(6),
    lineHeight: moderateFontScale(18),
  },
  carCard: {
    borderRadius: scale(24),
    padding: scale(18),
    marginBottom: verticalScale(20),
    position: 'relative',
  },
  highlightBadge: {
    position: 'absolute',
    top: scale(-10),
    left: scale(20),
    backgroundColor: '#F5C518',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(3),
  },
  highlightBadgeText: {
    color: '#101010',
    fontSize: moderateFontScale(10),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: verticalScale(4),
  },
  carName: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  carSpecialty: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  fareInfo: {
    alignItems: 'flex-end',
  },
  farePrice: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  fareUnit: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
  },
  imageBlock: {
    height: verticalScale(110),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: verticalScale(10),
  },
  carVisualImage: {
    width: '80%',
    height: '100%',
  },
  specsBar: {
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    paddingVertical: verticalScale(12),
    marginVertical: verticalScale(8),
    justifyContent: 'space-between',
  },
  specBox: {
    flex: 1,
    alignItems: 'center',
  },
  specVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  specLbl: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  barDivider: {
    width: 1.2,
    height: '70%',
    alignSelf: 'center',
  },
  carDescText: {
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(19),
    marginVertical: verticalScale(8),
  },
  bookButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(46),
    marginTop: verticalScale(10),
    gap: scale(6),
  },
  bookButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
});
