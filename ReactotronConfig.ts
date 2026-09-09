declare global {
  interface Console {
    tron: any;
  }
}

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let Reactotron: any = null;

if (__DEV__ && Platform.OS !== 'web') {
  try {
    const ReactotronModule = require('reactotron-react-native').default;

    // Auto-detect PC host IP from Expo Constants / ScriptURL so physical phones & emulators connect automatically
    let host = 'localhost';
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost || (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      host = hostUri.split(':')[0];
    } else if (NativeModules.SourceCode?.scriptURL) {
      const address = NativeModules.SourceCode.scriptURL.split('://')[1]?.split('/')[0];
      host = address?.split(':')[0] || 'localhost';
    }

    Reactotron = ReactotronModule
      .configure({
        name: 'Vibzz Mobility App',
        host: host,
      })
      .useReactNative({
        asyncStorage: false,
        networking: {
          // Ignore Metro bundler noise, HMR updates, and asset requests
          ignoreUrls: /symbolicate|logs|hot|127\.0\.0\.1:8081|localhost:8081|\.svg|\.png/,
        },
        editor: false,
        errors: { veto: () => false },
        overlay: false,
      })
      .connect();

    if (Reactotron && typeof Reactotron.clear === 'function') {
      Reactotron.clear();
    }

    console.tron = Reactotron;
    console.log(`⚡ [Reactotron] Connected to host: ${host}:9090 | Network inspection active!`);
  } catch (error) {
    console.warn('Reactotron initialization warning:', error);
    console.tron = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      display: console.log,
    };
  }
} else {
  console.tron = {
    log: () => { },
    warn: () => { },
    error: () => { },
    display: () => { },
  };
}

export default Reactotron;