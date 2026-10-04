import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to Express so the client can use relative /api URLs (no CORS needed)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
