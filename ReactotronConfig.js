import Reactotron from 'reactotron-react-native';
import { Platform } from 'react-native';

if (__DEV__) {
  Reactotron
    .configure({
      name: 'Vibe Platform App',
      // For Android physical devices / emulator connection fallback
      // host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
    })
    .useReactNative({
      asyncStorage: false,
      networking: {
        ignoreUrls: /symbolicate/, // Filter out Metro bundler noise
      },
      editor: false,
      errors: { veto: () => false },
      overlay: false,
    })
    .connect();

  // Clear timeline on fresh app reloads
  if (Reactotron.clear) {
    Reactotron.clear();
  }

  // Attach Reactotron to console.tron for quick custom logging anywhere in the app
  console.tron = Reactotron;
}

export default Reactotron;
