import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Local development simulation for /api/health so serverless calls work during vite dev
function apiDevPlugin() {
  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              status: 'ok',
              app: 'Ctrl+Savings',
              message: 'Serverless endpoint active and responsive.',
              timestamp: new Date().toISOString(),
            })
          )
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss(),
    apiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'Logo.png'],
      manifest: {
        name: 'Ctrl+Savings',
        short_name: 'Ctrl+Savings',
        description: 'A zero-lag, offline-first allowance & savings tracker.',
        theme_color: '#062c1d',
        background_color: '#031a11',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/Logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      }
    })
  ],
})
