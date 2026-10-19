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
        // Surface a clear 503 (and console hint) when the Node backend is
        // not running, instead of an opaque 500 that looks like an app bug.
        proxyErrorHandler: (err, req, res) => {
          console.error(
            `[vite proxy] ${req.method} ${req.url} -> backend unreachable (${err.code || err.message}). ` +
              'Is the server running?  cd server && npm run dev'
          );
          if (res && !res.headersSent && typeof res.writeHead === 'function') {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                message:
                  'Backend API is not running on port 5000. Start it with: cd server && npm run dev',
              })
            );
          }
        },
      },
})
