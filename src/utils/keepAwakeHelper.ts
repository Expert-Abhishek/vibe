let activateKeepAwakeAsync: any;
let deactivateKeepAwake: any;

try {
  const keepAwake = require('expo-keep-awake');
  activateKeepAwakeAsync = keepAwake.activateKeepAwakeAsync;
  deactivateKeepAwake = keepAwake.deactivateKeepAwake;
} catch (e) {}

export async function safeActivateKeepAwake(tag?: string) {
  try {
    if (activateKeepAwakeAsync) {
      await activateKeepAwakeAsync(tag);
    }
  } catch (e) {
    // Quietly catch keep awake rejection
  }
}

export async function safeDeactivateKeepAwake(tag?: string) {
  try {
    if (deactivateKeepAwake) {
      await deactivateKeepAwake(tag);
    }
  } catch (e) {
    // Quietly catch deactivate keep awake rejection
  }
}
