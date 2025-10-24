'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function VerifyPhonePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState('input') // 'input' or 'verify'
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
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

    setProfile(profileData)

    // Pre-fill phone number if available
    if (profileData?.phone) {
      setPhoneNumber(profileData.phone)
    }

    // If already verified, redirect to dashboard
    if (profileData?.phone_verified) {
      router.push('/dashboard')
      return
    }

    setLoading(false)
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setMessage(null)

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid phone number')
      setSending(false)
      return
    }

    try {
      // Update phone number in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: phoneNumber })
        .eq('id', user.id)

      if (updateError) {
        setError('Failed to update phone number: ' + updateError.message)
        setSending(false)
        return
      }

      // In production, send actual SMS verification code here
      setMessage('Verification code sent! (For development, enter any 6 digits)')
      setStep('verify')
      setSending(false)

    } catch (err) {
      setError('An error occurred: ' + err.message)
      setSending(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    setMessage(null)

    // Validate code format
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code')
      setVerifying(false)
      return
    }

    try {
      // In production, verify the code with SMS service
      // For development, accept any 6-digit code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', user.id)

      if (updateError) {
        setError('Failed to verify phone: ' + updateError.message)
        setVerifying(false)
        return
      }

      setMessage('Phone verified successfully! Redirecting to dashboard...')

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      setError('An error occurred: ' + err.message)
      setVerifying(false)
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h1>
          <p className="text-gray-600">
            Phone verification helps secure your account and enables SMS notifications
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

        {step === 'input' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="+44 123 456 7890"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Include country code (e.g., +44 for UK)
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {sending ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Code sent to: <strong>{phoneNumber}</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep('input')
                  setVerificationCode('')
                  setMessage(null)
                }}
                className="text-sm text-blue-600 hover:underline mt-1"
              >
                Change number
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {verifying ? 'Verifying...' : 'Verify Phone'}
            </button>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:bg-gray-400 transition"
            >
              {sending ? 'Sending...' : 'Resend Code'}
            </button>
          </form>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-4 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
        >
          Back to Dashboard
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: In production, this would send an actual SMS code. For development, any 6-digit number will work.
        </p>
      </div>
    </div>
  )
}
