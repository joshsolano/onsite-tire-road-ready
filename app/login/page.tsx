'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (params.get('error') === 'inactive') {
      setError('Your account has been deactivated. Please contact your administrator.')
    }
  }, [params])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'technician') router.push('/tech')
      else router.push('/admin')
    }
  }

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Sign in</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-field"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2"
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0A0A0A' }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="32" cy="32" r="30" stroke="#444" strokeWidth="4"/>
            <circle cx="32" cy="32" r="20" stroke="#666" strokeWidth="3"/>
            <circle cx="32" cy="32" r="10" fill="#1A1A1A" stroke="#555" strokeWidth="2"/>
            <rect x="2" y="29" width="8" height="6" rx="1" fill="#555"/>
            <rect x="54" y="29" width="8" height="6" rx="1" fill="#555"/>
            <rect x="29" y="2" width="6" height="8" rx="1" fill="#555"/>
            <rect x="29" y="54" width="6" height="8" rx="1" fill="#555"/>
            <path d="M32 20c-4.4 0-8 3.6-8 8 0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8z" fill="#C41230"/>
            <circle cx="32" cy="28" r="3" fill="white"/>
          </svg>
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-xl tracking-tight">Road Ready Platform</div>
          <div className="text-gray-500 text-sm mt-0.5">Mobile Tire Service</div>
        </div>
      </div>

      <Suspense fallback={<div className="w-full max-w-sm mx-4"><div className="bg-white rounded-2xl p-8 shadow-2xl"><div className="spinner mx-auto" /></div></div>}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-gray-600 text-xs">
        Road Ready Platform · Mobile Tire Service
      </p>
    </div>
  )
}
