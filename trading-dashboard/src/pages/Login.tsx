import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ChartBarIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password)
      } else {
        await signUp(formData.email, formData.password, formData.name)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary-600/20 blur-3xl" />
      <div className="relative z-10 flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="trading-card p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">FinanceAI</p>
                <h2 className="text-2xl font-bold text-white">Professional Trading Terminal</h2>
              </div>
            </div>
            <p className="mt-4 text-dark-300">Sign in to access your strategies, market overview, and orders.</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-md bg-dark-800 p-4">
                <p className="text-xs text-dark-400">Strategies</p>
                <p className="mt-1 text-lg font-semibold text-white">Multi-run</p>
              </div>
              <div className="rounded-md bg-dark-800 p-4">
                <p className="text-xs text-dark-400">Orders</p>
                <p className="mt-1 text-lg font-semibold text-white">TP/SL</p>
              </div>
              <div className="rounded-md bg-dark-800 p-4">
                <p className="text-xs text-dark-400">Market</p>
                <p className="mt-1 text-lg font-semibold text-white">Realtime</p>
              </div>
            </div>
          </div>
          <div className="trading-card p-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h3>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm text-dark-300 mb-2">Full name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm text-dark-300 mb-2">Email or username</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Email or username (try admin)"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm text-dark-300 mb-2">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Password (try admin)"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>

              {error && (
                <div className="rounded-md bg-danger-900/40 border border-danger-700 p-3">
                  <p className="text-sm text-danger-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  isLogin ? 'Sign in' : 'Sign up'
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-primary-400 hover:text-primary-300"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                  }}
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
                <p className="text-xs text-dark-400">Tip: use admin/admin for demo</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
