import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { authRoutes } from './routes/auth'
import { teamRoutes } from './routes/teams'
import { playerRoutes } from './routes/players'
import { sanctionRoutes } from './routes/sanctions'
import { auditRoutes } from './routes/audit'
import { authMiddleware } from './middleware/auth'
import { auditMiddleware } from './middleware/audit'

export interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://futmanager.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Audit logging middleware for all requests (Security requirement S-02)
app.use('*', auditMiddleware)

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'FutManager API by Hakan', 
    version: '1.0.0',
    environment: c.env.ENVIRONMENT 
  })
})

// Public routes
app.route('/auth', authRoutes)

// Protected routes - require authentication
app.use('/api/*', authMiddleware)
app.route('/api/teams', teamRoutes)
app.route('/api/players', playerRoutes)
app.route('/api/sanctions', sanctionRoutes)
app.route('/api/audit', auditRoutes)

// Additional protected route for teams (also needs auth)
app.use('/teams/*', authMiddleware)
app.route('/teams', teamRoutes)

// Additional protected route for players (also needs auth)
app.use('/players/*', authMiddleware)
app.route('/players', playerRoutes)

// Additional protected route for sanctions (also needs auth)
app.use('/sanctions/*', authMiddleware)
app.route('/sanctions', sanctionRoutes)

export default app
