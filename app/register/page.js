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
  const [gdprConsent, setGdprConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Specialization categories with subcategories
  const specializationCategories = {
    'Designers / Professionals': [
      'M&E Designer',
      'Structural Engineer',
      'Architectural Designer',
      'Acoustic Consultant',
      'Fire Engineer',
      'BREEAM Specialist',
      'PES Specialist',
      'CDM Coordinator',
      'Quantity Surveyor'
    ],
    'Specialist Installations': [
      'Fire Stopping',
      'Sprinkler Systems',
      'Movement Monitoring',
      'BMS (Building Management Systems)',
      'Pressurisation Systems',
      'Lift Installer',
      'Lightning Protection'
    ],
    'Electrical & Security': [
      'Electrical Installation',
      'IT Installer / Data Cabling',
      'CCTV Installer',
      'Access Control / Door Entry',
      'Fire Alarm Systems',
      'Emergency Lighting',
      'AV Systems',
      'Intruder Alarm'
    ],
    'MEP': [
      'Plumber',
      'HVAC Installer',
      'Drainage Specialist'
    ]
  }

  // Standalone specializations (no subcategories)
  const standaloneSpecializations = [
    'General Construction',
    'Steel Frame Specialist',
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
    'Renderer'
  ]

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState([])

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleSpecialization = (spec) => {
    if (specialization.includes(spec)) {
      setSpecialization(specialization.filter(s => s !== spec))
    } else if (specialization.length < 3) {
      setSpecialization([...specialization, spec])
    }
  }

  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Walidacja - checkbox GDPR
    if (!gdprConsent) {
      setError('You must accept the Privacy Policy and Terms & Conditions')
      setLoading(false)
      return
    }

    // Walidacja - minimum 1 specjalizacja
    if (specialization.length === 0) {
      setError('Please select at least one specialization')
      setLoading(false)
      return
    }

    // Sign up with Supabase Auth
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

    // Log GDPR consent
    if (authData.user) {
      try {
        const clientIp = await getClientIp()
        const userAgent = navigator.userAgent

        await fetch('/api/gdpr/log-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            ipAddress: clientIp,
            userAgent: userAgent
          })
        })
      } catch (err) {
        console.error('Failed to log GDPR consent:', err)
      }

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

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {/* Categories with subcategories */}
                {Object.entries(specializationCategories).map(([category, subcategories]) => (
                  <div key={category} className="border-b border-gray-200 last:border-b-0">
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <span className="font-semibold text-gray-800">{category}</span>
                      <span className="text-gray-500 text-sm">
                        {expandedCategories.includes(category) ? '▲' : '▼'}
                      </span>
                    </button>
                    
                    {/* Subcategories */}
                    {expandedCategories.includes(category) && (
                      <div className="bg-white">
                        {subcategories.map((spec) => (
                          <label
                            key={spec}
                            className={`flex items-center px-6 py-2 hover:bg-blue-50 cursor-pointer border-l-4 border-transparent hover:border-blue-400 ${
                              specialization.length >= 3 && !specialization.includes(spec) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={specialization.includes(spec)}
                              onChange={() => toggleSpecialization(spec)}
                              disabled={specialization.length >= 3 && !specialization.includes(spec)}
                              className="mr-3 w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{spec}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Standalone specializations */}
                <div className="border-t-2 border-gray-300">
                  <div className="px-4 py-2 bg-gray-100">
                    <span className="font-semibold text-gray-700 text-sm">Other Trades</span>
                  </div>
                  {standaloneSpecializations.map((spec) => (
                    <label
                      key={spec}
                      className={`flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer ${
                        specialization.length >= 3 && !specialization.includes(spec) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={specialization.includes(spec)}
                        onChange={() => toggleSpecialization(spec)}
                        disabled={specialization.length >= 3 && !specialization.includes(spec)}
                        className="mr-3 w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{spec}</span>
                    </label>
                  ))}
                </div>
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

          <div className="mb-6 flex items-start" suppressHydrationWarning>
            <input
              type="checkbox"
              id="gdprConsent"
              name="gdprConsent"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              className="mt-1 mr-3"
              suppressHydrationWarning
            />
            <label htmlFor="gdprConsent" className="text-sm text-gray-700">
              I accept the{' '}
              <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              {' '}and{' '}
              <a href="/terms-conditions" target="_blank" className="text-blue-600 hover:underline">
                Terms & Conditions
              </a>
              {' '}*
            </label>
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