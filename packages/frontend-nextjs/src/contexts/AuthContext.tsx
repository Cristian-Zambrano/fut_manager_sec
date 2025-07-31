'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { getApiUrl } from '@/utils/api'
import { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'team_owner' | 'vocal'

interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name: string
}

interface AuthContextType {
  user: UserProfile | null
  supabaseUser: User | null
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
  const [user, setUser] = useState<UserProfile | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user)
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user)
        await fetchUserProfile(session.user.id)
      } else {
        setSupabaseUser(null)
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

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
        setSupabaseUser(data.user)
        await fetchUserProfile(data.user.id)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
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
      setSupabaseUser(null)
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
    supabaseUser,
    login,
    register,
    logout,
    getToken,
    loading
  }), [user, supabaseUser, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
