declare global {
  interface Console {
    tron: any;
  }
}

import { Platform } from 'react-native';

let Reactotron: any = null;

if (__DEV__ && Platform.OS !== 'web') {
  try {
    const ReactotronModule = require('reactotron-react-native').default;

    Reactotron = ReactotronModule
      .configure({
        name: 'Vibe App',
        // host: '192.168.1.X', // Un-comment & set PC IP if testing on a physical phone
      })
      .useReactNative({
        asyncStorage: false,
        networking: {
          // Ignore Metro bundler noise, HMR updates, symbolication, and asset requests
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
    console.log('⚡ Reactotron network monitoring active for fetch() requests!');
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