import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.businesstype.sim',
  appName: 'Business Type',
  webDir: 'dist',
  server: {
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
    allowMixedContent: false,
  },
}

export default config
