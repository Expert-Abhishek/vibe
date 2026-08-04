import { Audio } from 'expo-av';

export async function playNotificationChime() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const soundObject = new Audio.Sound();
    await soundObject.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: true, volume: 1.0 }
    );

    soundObject.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        soundObject.unloadAsync();
      }
    });
  } catch (e) {
    console.warn('playNotificationChime warning:', e);
  }
}
