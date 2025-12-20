import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kmdfvofhzkzajnjwytpf.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZGZ2b2Zoemt6YWpuand5dHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDMyMzYsImV4cCI6MjA4MTExOTIzNn0.quRVR8r_de3LSTC4jtMe7tjtvpSoviFrOYiac6Gyo0k'
const isValidUrl = (u: string) => /^https?:\/\//.test(u)

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
