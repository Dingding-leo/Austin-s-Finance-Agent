import { supabase } from './api'

export const authService = {
  async signIn(email: string, password: string) {
    if (!supabase) {
      const isAdmin = (email === 'admin' || email === 'admin@local') && password === 'admin'
      if (!isAdmin) throw new Error('Supabase not configured. Use admin/admin for mock login.')
      const user = {
        id: 'mock-admin',
        email: 'admin@local',
        user_metadata: { name: 'Admin' },
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('mock_user', JSON.stringify(user))
      return { user }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string, name: string) {
    if (!supabase) {
      const user = {
        id: 'mock-' + Date.now().toString(),
        email: email || 'user@local',
        user_metadata: { name: name || 'User' },
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('mock_user', JSON.stringify(user))
      return { user }
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    if (!supabase) {
      localStorage.removeItem('mock_user')
      return
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    if (!supabase) {
      const raw = localStorage.getItem('mock_user')
      return raw ? JSON.parse(raw) : null
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) {
      // Simple mock subscription no-op
      return () => {}
    }
    
    return supabase.auth.onAuthStateChange(callback)
  },
}
