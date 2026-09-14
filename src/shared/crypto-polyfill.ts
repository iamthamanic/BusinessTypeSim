/**
 * Polyfill crypto.randomUUID for non-secure contexts (Android WebView over http://10.0.2.2).
 * Location: src/shared/crypto-polyfill.ts
 */
export function ensureCryptoRandomUUID(): void {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi || typeof cryptoApi.randomUUID === 'function') return
  if (typeof cryptoApi.getRandomValues !== 'function') return

  Object.defineProperty(cryptoApi, 'randomUUID', {
    configurable: true,
    writable: true,
    value(): string {
      const bytes = new Uint8Array(16)
      cryptoApi.getRandomValues(bytes)
      bytes[6] = (bytes[6]! & 0x0f) | 0x40
      bytes[8] = (bytes[8]! & 0x3f) | 0x80
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    },
  })
}
