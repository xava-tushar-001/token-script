import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend runs on :5173, the Express API on :3001.
// Any request to /api is proxied to the backend during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
