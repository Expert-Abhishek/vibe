import { Audio } from 'expo-av';

let activeSoundObject: Audio.Sound | null = null;

export async function playNotificationChime(loop: boolean = false) {
  try {
    await stopNotificationChime();

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const soundObject = new Audio.Sound();
    activeSoundObject = soundObject;

    await soundObject.loadAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: true, volume: 1.0, isLooping: loop }
    );

    soundObject.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !loop) {
        soundObject.unloadAsync().catch(() => {});
        if (activeSoundObject === soundObject) {
          activeSoundObject = null;
        }
      }
    });
  } catch (e) {
    console.warn('playNotificationChime warning:', e);
  }
}

export async function stopNotificationChime() {
  if (activeSoundObject) {
    try {
      await activeSoundObject.stopAsync();
      await activeSoundObject.unloadAsync();
    } catch (e) {}
    activeSoundObject = null;
  }
}
