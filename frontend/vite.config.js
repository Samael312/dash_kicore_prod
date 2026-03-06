import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['metrics.kiconex.com'],
    hmr: {
      clientPort: 443, // Forzar que el cliente intente HMR via 443
    }
  }
})
