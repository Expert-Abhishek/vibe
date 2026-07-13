import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function TripsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Trips</ThemedText>
      <ThemedText style={styles.text}>Your booking history is empty.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101014',
  },
  text: {
    marginTop: 10,
    color: '#8D8D97',
  },
});
