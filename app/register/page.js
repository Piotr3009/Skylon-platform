'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [specialization, setSpecialization] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const specializations = [
    'General Construction',
    'Steel Frame Specialist',
    'Plumber',
    'HVAC Installer',
    'Electrician',
    'Fire Protection Specialist',
    'Lift Engineer',
    'Scaffolder',
    'Decorator/Painter',
    'Bricklayer',
    'Joinery Installer',
    'Carpenter',
    'Dry Liner',
    'Plasterer',
    'Basement Specialist',
    'Loft Specialist',
    'Tiler',
    'Floor Specialist',
    'Staircase Specialist',
    'Roofer',
    'Glazier',
    'Groundworks',
    'Drainage Specialist',
    'Renderer'
  ]

  const toggleSpecialization = (spec) => {
    if (specialization.includes(spec)) {
      setSpecialization(specialization.filter(s => s !== spec))
    } else if (specialization.length < 3) {
      setSpecialization([...specialization, spec])
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Walidacja - minimum 1 specjalizacja
    if (specialization.length === 0) {
      setError('Please select at least one specialization')
      setLoading(false)
      return
    }

    // Sign up with Supabase Auth - przekazujemy dane w metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          phone: phone || null,
          specialization: specialization
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Profil zostanie utworzony automatycznie przez trigger z metadanych
    if (authData.user) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Register as Subcontractor</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleRegister} suppressHydrationWarning>
          <div className="mb-4" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              suppressHydrationWarning
            />
          </div>

          <div className="mb-4" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              name="companyName"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>

          <div className="mb-4" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">Phone (Optional)</label>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7XXX XXXXXX"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>

          <div className="mb-4 relative" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">
              Specialization * <span className="text-sm text-gray-500">(Select 1-3 specializations)</span>
            </label>
            
            {/* Selected tags */}
            {specialization.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {specialization.map((spec) => (
                  <span
                    key={spec}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className="hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown button */}
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex justify-between items-center bg-white"
            >
              <span className="text-gray-700">
                {specialization.length === 0 ? 'Select specializations...' : `${specialization.length} selected`}
              </span>
              <span className="text-gray-500">▼</span>
            </button>

            {/* Dropdown list */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                {specializations.map((spec) => (
                  <label
                    key={spec}
                    className={`flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer ${
                      specialization.length >= 3 && !specialization.includes(spec) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={specialization.includes(spec)}
                      onChange={() => toggleSpecialization(spec)}
                      disabled={specialization.length >= 3 && !specialization.includes(spec)}
                      className="mr-2"
                    />
                    <span className="text-sm">{spec}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              suppressHydrationWarning
            />
          </div>

          <div className="mb-6" suppressHydrationWarning>
            <label className="block text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              suppressHydrationWarning
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  )
}