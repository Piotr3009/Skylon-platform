'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Get profile data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If already verified, redirect to dashboard
    if (profileData?.email_verified) {
      router.push('/dashboard')
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const handleResendVerification = async () => {
    setSending(true)
    setError(null)
    setMessage(null)

    try {
      // In a production environment, you would send an actual verification email here
      // For now, we'll just mark the email as verified in the database
      // This simulates the verification process

      // Option 1: Manual verification (for testing)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('id', user.id)

      if (updateError) {
        setError('Failed to verify email: ' + updateError.message)
        setSending(false)
        return
      }

      setMessage('Email verified successfully! Redirecting to dashboard...')

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      setError('An error occurred: ' + err.message)
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Your email address needs to be verified to access all features
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Email:</strong> {user?.email}
          </p>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Why verify?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Download project documents and specifications
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Receive important project notifications
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit proposals and communicate with coordinators
            </li>
          </ul>
        </div>

        <button
          onClick={handleResendVerification}
          disabled={sending}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition mb-3"
        >
          {sending ? 'Verifying...' : 'Verify Email Now'}
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
        >
          Back to Dashboard
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: In production, this would send a verification email. For development, clicking &quot;Verify Email Now&quot; will automatically verify your account.
        </p>
      </div>
    </div>
  )
}