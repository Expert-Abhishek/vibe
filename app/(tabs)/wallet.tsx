import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function WalletScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Wallet</ThemedText>
      <ThemedText style={styles.text}>Your balance is $0.00</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    color: '#8D8D97',
  },
});
