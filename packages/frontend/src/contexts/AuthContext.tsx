import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getApiUrl } from '../utils/api'

// Create Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

export type UserRole = 'admin' | 'team_owner' | 'vocal'

interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  logout: () => Promise<void>
  getToken: () => Promise<string | null>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, _session) => {
      // Auth state change handling is managed through the initial session check
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUser(null)
      } else if (data) {
        setUser({
          id: data.id,
          email: data.email,
          role: data.role,
          full_name: data.full_name
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, fullName: string, role: 'admin' | 'team_owner' | 'vocal') => {
    try {
      setLoading(true)
      
      // Call backend registration endpoint
      const response = await fetch(getApiUrl('auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          full_name: fullName,
          role 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }

      // After successful registration, sign in the user
      await login(email, password)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getToken = async (): Promise<string | null> => {
    try {
      const { data: session } = await supabase.auth.getSession()
      return session.session?.access_token || null
    } catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  }

  const value = useMemo(() => ({
    user,
    login,
    register,
    logout,
    getToken,
    loading
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
