import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

// Local development simulation for backend API routes so serverless calls work during vite dev & preview
function apiDevPlugin(env) {
  const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const AUTH_SECRET = env.AUTH_SECRET || 'ctrl_savings_pbl_secure_salt_2026'

  const apiMiddleware = async (req, res, next) => {
    // Backend Login API
    if (req.url === '/api/login' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { username, password } = JSON.parse(body || '{}')
          if (!username || !password) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username and password are required.' }))
            return
          }

          const cleanUsername = username.trim().toLowerCase()
          const hashedPassword = hashPassword(password, AUTH_SECRET)

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
          
          const { data, error } = await supabase
            .from('app_users')
            .select('id, username')
            .eq('username', cleanUsername)
            .eq('password', hashedPassword)
            .maybeSingle()
          
          res.setHeader('Content-Type', 'application/json')
          if (error) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: error.message }))
          } else if (!data) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid username or password.' }))
          } else {
            res.statusCode = 200
            res.end(JSON.stringify({ data: data.id }))
          }
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Server error processing login.' }))
        }
      })
      return
    }

    // Backend Register API
    if (req.url === '/api/register' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { username, password } = JSON.parse(body || '{}')
          if (!username || !password) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username and password are required.' }))
            return
          }

          const cleanUsername = username.trim().toLowerCase()

          if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username must be between 3 and 30 characters.' }))
            return
          }

          if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores.' }))
            return
          }

          if (password.length < 4) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Password must be at least 4 characters.' }))
            return
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
          
          // Check if username is already taken
          const { data: existing, error: checkErr } = await supabase
            .from('app_users')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle()

          if (checkErr) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: checkErr.message }))
            return
          }

          if (existing) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username already exists.' }))
            return
          }

          // Hash password securely
          const hashedPassword = hashPassword(password, AUTH_SECRET)

          // Insert new user
          const { data, error: insertErr } = await supabase
            .from('app_users')
            .insert({ username: cleanUsername, password: hashedPassword })
            .select('id')
            .single()
          
          res.setHeader('Content-Type', 'application/json')
          if (insertErr) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: insertErr.message }))
          } else {
            res.statusCode = 200
            res.end(JSON.stringify({ data: data.id }))
          }
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Server error processing registration.' }))
        }
      })
      return
    }

    // Health Route
    if (req.url === '/api/health') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'ok', app: 'Ctrl+Savings' }))
      return
    }
    
    next()
  }

  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(apiMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      svelte(),
      tailwindcss(),
      apiDevPlugin(env),
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
  }
})
