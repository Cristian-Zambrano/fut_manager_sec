import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Env } from '../index'

const authRoutes = new Hono<{ Bindings: Env }>()

// Validation schemas
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6)
})

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'team_owner', 'vocal']),
  full_name: z.string().min(2)
})

// Login endpoint
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = loginSchema.parse(body)
    
    // Create Supabase client
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    )

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error)
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    if (!data.user || !data.session) {
      return c.json({ error: 'Login failed' }, 401)
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return c.json({ error: 'User profile not found' }, 404)
    }

    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name
      }
    })
  } catch (error) {
    console.error('Login endpoint error:', error)
    return c.json({ error: 'Login failed' }, 400)
  }
})

// Register endpoint
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, role, full_name } = registerSchema.parse(body)

    // Create Supabase client with service role for user creation
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

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })

    if (error) {
      console.error('Registration error:', error)
      return c.json({ error: 'Registration failed' }, 400)
    }

    if (!data.user) {
      return c.json({ error: 'User creation failed' }, 400)
    }

    // Wait a moment for the database trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify the profile was created by the trigger
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile verification error:', profileError)
      // If profile wasn't created, try to delete the user and fail
      await supabase.auth.admin.deleteUser(data.user.id)
      return c.json({ error: 'Profile creation failed' }, 400)
    }

    return c.json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name
      }
    })
  } catch (error) {
    console.error('Registration endpoint error:', error)
    return c.json({ error: 'Registration failed' }, 400)
  }
})

// Logout endpoint
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'Already logged out' })
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    )

    // Set the session token
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '' // We don't have refresh token here
    })

    // Sign out
    await supabase.auth.signOut()

    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ message: 'Logged out successfully' }) // Always return success for logout
  }
})

// Refresh token endpoint
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return c.json({ error: 'Refresh token required' }, 400)
    }

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (error || !data.session) {
      return c.json({ error: 'Invalid refresh token' }, 401)
    }

    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return c.json({ error: 'Token refresh failed' }, 400)
  }
})

export { authRoutes }
