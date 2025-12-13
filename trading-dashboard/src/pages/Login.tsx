import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
// Icons removed to prevent oversized rendering on some environments

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
    <div className="min-h-screen hero-wrap relative">
      <div className="absolute top-32 left-1/2 -translate-x-1/2 flex items-center gap-4 brand-glow">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400">
          <path d="M12 2c5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 10c1.5-3 6.5-3 8 0M8 14c1.5 3 6.5 3 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12 5v14" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="font-display text-white text-5xl md:text-6xl tracking-wide">AI TRADING</span>
      </div>

      <div className="absolute right-12 top-24 hidden lg:block opacity-80 brand-glow">
        <svg width="420" height="260" viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke="#60a5fa" strokeWidth="1.2" opacity="0.85">
            <path d="M120 60c30-40 120-40 150 0M120 180c30 40 120 40 150 0" />
            <path d="M195 60v120" />
          </g>
          <g fill="#3b82f6" opacity="0.8">
            <rect x="320" y="120" width="14" height="48" rx="3" />
            <rect x="340" y="90" width="14" height="78" rx="3" />
            <rect x="360" y="130" width="14" height="52" rx="3" />
            <rect x="380" y="100" width="14" height="82" rx="3" />
          </g>
        </svg>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="login-card w-[78%] max-w-5xl p-8 bg-white shadow-xl border border-gray-200 rounded-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 font-display tracking-wide" style={{ color: '#000' }}>{isLogin ? 'Login' : 'Create Account'}</h1>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm mb-2 text-center" style={{ color: '#000' }}>Full Name</label>
                <div className="flex justify-center">
                  <div className="input-with-icon w-[78%]">
                    <svg viewBox="0 0 24 24" className="text-gray-400"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="none" stroke="currentColor"/></svg>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="input-soft w-full rounded-2xl text-gray-900 bg-gray-50 border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-center" style={{ color: '#000' }}>Email address</label>
              <div className="flex justify-center">
                <div className="input-with-icon w-[78%]">
                  <svg viewBox="0 0 24 24" className="text-gray-400"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor"/><path d="M4 6l8 6 8-6" fill="none" stroke="currentColor"/></svg>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    className="input-soft w-full rounded-2xl text-gray-900 bg-gray-50 border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-center" style={{ color: '#000' }}>Password</label>
              <div className="flex justify-center">
                <div className="input-with-icon w-[78%]">
                  <svg viewBox="0 0 24 24" className="text-gray-400"><path d="M6 10h12v8H6z" fill="none" stroke="currentColor"/><path d="M9 10V8a3 3 0 016 0v2" fill="none" stroke="currentColor"/></svg>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input-soft w-full rounded-2xl text-gray-900 bg-gray-50 border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            {isLogin && (
              <>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <label className="flex items-center gap-2 text-sm font-display" style={{ color: '#000' }}>
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    Remember me
                  </label>
                  <button type="button" className="text-sm font-display" style={{ color: '#000' }}>Forgot password?</button>
                </div>
              </>
            )}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mx-auto w-[78%]">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
            <div className="flex flex-col items-center gap-6 mt-8 mb-4">
              <button
                type="submit"
                disabled={loading}
                className="w-[78%] rounded-full bg-primary-600 text-white py-3 text-base font-semibold hover:bg-primary-700 transition disabled:opacity-50 shadow-lg shadow-primary-500/30"
              >
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
              </button>
              <div className="text-sm font-display" style={{ color: '#000' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  className="font-semibold" style={{ color: '#000' }}
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                  }}
                >
                  {isLogin ? 'Sign up' : 'Login'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
