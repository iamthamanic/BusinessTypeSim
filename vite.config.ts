import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Local DX: browser talks to same-origin `/api`; Vite proxies to remote or local API.
 * That avoids cross-origin cookie failures when developing on localhost.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = (env.VITE_DEV_API_TARGET || 'https://businesstypesim.raccoova.com').replace(/\/$/, '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          // Hostinger nginx serves the API under `/api/*`. Local Hono on :3000 is bare (`/auth`).
          rewrite: proxyTarget.includes('127.0.0.1') || proxyTarget.includes('localhost')
            ? (path) => path.replace(/^\/api/, '')
            : undefined,
        },
      },
    },
    build: { target: 'es2022' },
  }
})
