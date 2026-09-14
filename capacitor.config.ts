import type { CapacitorConfig } from '@capacitor/cli'

/** Set CAP_LIVE_RELOAD=1 when syncing for Android emulator → Vite on the host. */
const liveReload = process.env.CAP_LIVE_RELOAD === '1'

const config: CapacitorConfig = {
  appId: 'app.businesstype.sim',
  appName: 'Business Type',
  webDir: 'dist',
  server: {
    ...(liveReload
      ? {
          url: 'http://10.0.2.2:5173',
          cleartext: true,
        }
      : {}),
    androidScheme: 'https',
  },
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#070f18',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#070f18',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: liveReload,
  },
}

export default config
