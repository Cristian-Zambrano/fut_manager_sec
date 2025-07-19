import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'

export interface AuthContext {
  user: {
    id: string
    email: string
    role: 'admin' | 'team_owner' | 'vocal'
  }
}

export const authMiddleware = createMiddleware<{ Bindings: Env, Variables: AuthContext }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401)
    }


    const token = authHeader.split(' ')[1]
    
    try {
      // Create Supabase client with service role key for server-side operations
      const supabase = createClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return c.json({ error: 'Unauthorized: Invalid token' }, 401)
      }

      // Get user profile with role from database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return c.json({ error: 'Unauthorized: User profile not found' }, 401)
      }

      c.set('user', {
        id: user.id,
        email: user.email || '',
        role: profile.role as 'admin' | 'team_owner' | 'vocal'
      })

      await next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return c.json({ error: 'Unauthorized: Authentication failed' }, 401)
    }
  }
)

export const requireRole = (allowedRoles: Array<'admin' | 'team_owner' | 'vocal'>) => {
  return createMiddleware<{ Bindings: Env, Variables: AuthContext }>(
    async (c, next) => {
      const user = c.get('user')
      
      if (!allowedRoles.includes(user.role)) {
        return c.json({ error: 'Forbidden: Insufficient permissions' }, 403)
      }

      await next()
    }
  )
}
