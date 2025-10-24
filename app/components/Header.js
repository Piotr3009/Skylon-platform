'use client'

import { useRouter } from 'next/navigation'

export default function Header({
  title,
  subtitle,
  user,
  profile,
  onLogout,
  showHome = true,
  children
}) {
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {showHome && (
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            )}

            {user ? (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Dashboard
                </button>
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || profile?.company_name || user.email}
                    </div>
                    {profile?.company_name && profile?.full_name && (
                      <div className="text-xs text-gray-600">{profile.company_name}</div>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                    {profile?.role || 'user'}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Logout
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Register
                </button>
              </>
            )}

            {children}
          </div>
        </div>
      </div>
    </header>
  )
}
