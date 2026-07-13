import { Link, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { MaterialIcons } from '@expo/vector-icons';
const roles = [
  {
    key: 'rider' as const,
    title: 'Sign up as Rider',
    subtitle: 'Book rides and arrive in style',
    iconName: 'person' as const, // Material name
    color: '#F5C518',
  },
  {
    key: 'driver' as const,
    title: 'Sign up as Driver',
    subtitle: 'Earn on your schedule, drive when you want',
    iconName: 'directions-car' as const, // Material name
    color: '#0d1b3e',
  },
  {
    key: 'guide' as const,
    title: 'Sign up as Guide',
    subtitle: 'Explore the city with local experts',
    iconName: 'map' as const, // Material name
    color: '#10B981',
  },
];

type RoleKey = typeof roles[number]['key'];

function RoleCard({ role, selected, onPress }: { role: (typeof roles)[number]; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.roleCard,
        selected ? styles.roleCardSelected : styles.roleCardDefault,
      ]}
    >
      <View style={[styles.roleIcon, { backgroundColor: '#f5c518' }]}>
        {/* IconSymbol की जगह MaterialIcons का इस्तेमाल करें */}
        <MaterialIcons
          name={role.iconName}
          size={scale(22)}
          color={selected ? '#101010' : '#ffffff'}
        />
      </View>
      <View style={styles.roleTextContainer}>
        <ThemedText type="title" style={[styles.roleTitle, selected && { color: '#ffffff' }]}>
          {role.title}
        </ThemedText>
        <ThemedText style={[styles.roleSubtitle, selected && { color: 'rgba(255,255,255,0.9)' }]}>
          {role.subtitle}
        </ThemedText>
      </View>
      {selected ? (
        <View style={styles.roleSelectedBadge}>
          <IconSymbol name="chevron.right" size={scale(18)} color="#0d1b3e" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);

  const player = useVideoPlayer(require('../../assets/screen.mp4'), (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

  const handleContinue = () => {
    if (selectedRole === 'rider') {
      router.push('/onboarding/rider');
    } else if (selectedRole === 'driver') {
      router.push('/onboarding/driver');
    } else if (selectedRole === 'guide') {
      router.push('/onboarding/guide');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <ThemedText style={styles.brandBadgeText}>V</ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.brandName}>
            Vibzz
          </ThemedText>
        </View>

        <View style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            Get Started
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Make your own vibe with us
          </ThemedText>
        </View>

        <View style={styles.card}>
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              role={role}
              selected={selectedRole === role.key}
              onPress={() => setSelectedRole(role.key)}
            />
          ))}
        </View>

        <View style={styles.footerPanel}>
          <View style={styles.buttonWrapper}>
            <Button
              title="Continue"
              variant={selectedRole ? 'primary' : 'ghost'}
              disabled={!selectedRole}
              onPress={handleContinue}
            />
          </View>
          <View style={styles.footerTextRow}>
            <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
            <Link href="/sign-in" style={styles.signInLink}>
              <ThemedText type="link">Sign in</ThemedText>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06101d',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 16, 29, 0.5)',
  },
  screen: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: 'space-between',
    paddingBottom: verticalScale(24),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },
  brandBadge: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(18),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#101010',
    fontSize: moderateFontScale(24),
    fontWeight: '900',
  },
  brandName: {
    marginLeft: scale(14),
    color: '#ffffff',
    fontSize: moderateFontScale(18),
    letterSpacing: 0.2,
  },
  hero: {
    marginTop: verticalScale(24),
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: moderateFontScale(38),
    lineHeight: moderateFontScale(44),
    letterSpacing: 0.2,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: verticalScale(10),
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateFontScale(16),
    lineHeight: moderateFontScale(24),
    textAlign: 'center',
  },
  card: {
    marginTop: verticalScale(24),
    gap: verticalScale(12),
    alignItems: 'center',
  },
  roleCard: {
    width: '92%',
    alignSelf: 'center',
    borderRadius: scale(20),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  roleCardDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  roleCardSelected: {
    backgroundColor: 'rgba(255,197,24,0.18)',
    borderColor: '#F5C518',
  },
  roleIcon: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  roleTitle: {
    fontSize: moderateFontScale(16),
    color: '#ffffff',
    lineHeight: moderateFontScale(22),
  },
  roleSubtitle: {
    marginTop: verticalScale(2),
    color: 'rgba(255,255,255,0.78)',
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(18),
  },
  roleSelectedBadge: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(12),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPanel: {
    gap: verticalScale(10),
    alignItems: 'center',
    marginTop: verticalScale(14),
  },
  buttonWrapper: {
    width: '92%',
    alignSelf: 'center',
  },
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(4),
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: moderateFontScale(14),
  },
  signInLink: {
    paddingVertical: 2,
  },
});
