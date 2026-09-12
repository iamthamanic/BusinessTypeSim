import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.businesstype.sim',
  appName: 'Business Type',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
  },
}

export default config
