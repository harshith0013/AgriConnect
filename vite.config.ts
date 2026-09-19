import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'AgriConnect',
      short_name: 'AgriConnect',
      description: 'Farmer-first crop care and market access foundation.',
      theme_color: '#285d43',
      background_color: '#f5f7ef',
      display: 'standalone',
      start_url: '/',
      icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },
  })],
})
