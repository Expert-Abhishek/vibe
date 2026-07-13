import { Video } from 'expo-av';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';

const roles = [
  {
    key: 'rider' as const,
    title: 'Sign up as Rider',
    subtitle: 'Book rides and arrive in style',
    iconName: 'person.fill' as const,
    color: '#F5C518',
  },
  {
    key: 'driver' as const,
    title: 'Sign up as Driver',
    subtitle: 'Earn on your schedule, drive when you want',
    iconName: 'car.fill' as const,
    color: '#0d1b3e',
  },
  {
    key: 'guide' as const,
    title: 'Sign up as Guide',
    subtitle: 'Explore the city with local experts',
    iconName: 'map.fill' as const, // SF Symbols ya Material Icon ke hisaab se change kar sakte hain
    color: '#10B981', // Guide ke liye ek clear Green/Emerald theme color
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
      <View style={[styles.roleIcon, { backgroundColor: '#f5c518'}]}> 
        <IconSymbol name={role.iconName} size={22} color={selected ? '#101010' : '#ffffff'} />
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
          <IconSymbol name="chevron.right" size={18} color="#0d1b3e" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);

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
      <Video
        source={require('../../assets/screen.mp4')}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
        isLooping
        isMuted
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#101010',
    fontSize: 24,
    fontWeight: '900',
  },
  brandName: {
    marginLeft: 14,
    color: '#ffffff',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  hero: {
    marginTop: 42,
    alignItems: 'center', 
  },
  title: {
    color: '#ffffff',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: 0.2,
    fontWeight: '900',
     textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    lineHeight: 26,
  
      textAlign: 'center',   
  },
  card: {
    marginTop: 36,
    gap: 16,
      alignItems: 'center', 
  },
  roleCard: {
    width: '88%',                // was '90%' — gives a touch more equal L/R margin
  alignSelf: 'center', 
    borderRadius: 22,
    padding: 18,
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
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  roleTitle: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 24,
  },
  roleSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },
  roleSelectedBadge: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPanel: {
    gap: 14,
      alignItems: 'center',
    
  },
  buttonWrapper: {
  width: '88%',                // same width as roleCard
  alignSelf: 'center',
},
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  signInLink: {
    paddingVertical: 2,
  },
});
