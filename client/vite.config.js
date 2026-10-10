import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mockApiPlugin } from './vite.mock-api.js'

// The REAL Node backend (server/, :5000) is the default — /api is proxied to
// it so the browser talks same-origin (cookies/JWT just work).
// Set VITE_USE_MOCK=1 to fall back to the in-memory mock API instead.
const useMock = process.env.VITE_USE_MOCK === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useMock ? [mockApiPlugin()] : [])],
  server: useMock
    ? {}
    : {
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: false,
          },
        },
      },
})
