import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['notebook.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // אל תכנס ל-cache בקשות POST/API
        runtimeCaching: [
          {
            // נכסים סטטיים (JS/CSS/images) — מהמטמון תחילה
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-v2',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // ניווט דפים — רשת תחילה, fallback לindex.html
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache-v2',
              networkTimeoutSeconds: 15,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ],
        // אל תשתמש ב-navigation preload (מקור שגיאת payload)
        navigationPreload: false
      },
      manifest: {
        name: 'הפנקס - מערכת שידוכים',
        short_name: 'הפנקס',
        description: 'מערכת שידוכים מתקדמת למגזר החרדי',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
