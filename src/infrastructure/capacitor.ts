/**
 * Capacitor runtime bootstrap — status bar, splash, back button, keyboard.
 * Location: src/infrastructure/capacitor.ts
 */
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isNative = Capacitor.isNativePlatform()

export async function bootstrapCapacitor(): Promise<void> {
  if (!isNative) return

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#070f18' })
  } catch (error) {
    console.warn('[capacitor] StatusBar unavailable', error)
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
  } catch (error) {
    console.warn('[capacitor] Keyboard unavailable', error)
  }

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
      return
    }
    void CapApp.exitApp()
  })

  try {
    await SplashScreen.hide({ fadeOutDuration: 280 })
  } catch (error) {
    console.warn('[capacitor] SplashScreen unavailable', error)
  }
}
