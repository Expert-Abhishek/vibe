import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export async function safeActivateKeepAwake(tag?: string) {
  try {
    await activateKeepAwakeAsync(tag);
  } catch (e) {
    // Quietly catch keep awake rejection (e.g. WakeLock permission missing or OS restriction)
  }
}

export async function safeDeactivateKeepAwake(tag?: string) {
  try {
    await deactivateKeepAwake(tag);
  } catch (e) {
    // Quietly catch deactivate keep awake rejection
  }
}
