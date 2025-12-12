import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata?.name || 'Trader',
            role: 'trader',
            is_active: true,
            created_at: currentUser.created_at,
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Set up auth state listener
    const subscription = authService.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Trader',
          role: 'trader',
          is_active: true,
          created_at: session.user.created_at,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      // Clean up subscription
      if (subscription) {
        try {
          if (typeof subscription === 'function') {
            subscription()
          } else if ('unsubscribe' in subscription) {
            (subscription as any).unsubscribe()
          }
        } catch (error) {
          console.error('Error cleaning up subscription:', error)
        }
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authService.signIn(email, password)
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || 'Trader',
          role: 'trader',
          is_active: true,
          created_at: data.user.created_at,
        })
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const data = await authService.signUp(email, password, name)
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || name,
          role: 'trader',
          is_active: true,
          created_at: data.user.created_at,
        })
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}