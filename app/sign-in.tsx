import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignInScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Sign in
      </ThemedText>
      <ThemedText style={styles.description}>
        This screen is still under development. Use the onboarding flow to choose a rider or driver account.
      </ThemedText>
      <Link href="/onboarding" style={styles.link}>
        <ThemedText type="link">Back to Get Started</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06101d',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 18,
    color: '#ffffff',
  },
  description: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  link: {
    alignSelf: 'flex-start',
  },
});
