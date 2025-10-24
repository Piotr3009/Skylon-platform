'use client'

import { useRouter } from 'next/navigation'

export default function Header({
  title,
  subtitle,
  user,
  profile,
  onLogout,
  showHome = true,
  showDashboard = true,
  gradient = false,
  children
}) {
  const router = useRouter()

  const headerClasses = gradient
    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 shadow-lg border-b border-indigo-800"
    : "bg-white shadow-sm border-b border-gray-200"

  const titleClasses = gradient
    ? "text-2xl font-bold text-white"
    : "text-2xl font-bold text-gray-900"

  const subtitleClasses = gradient
    ? "text-sm text-indigo-100 mt-1"
    : "text-sm text-gray-600 mt-1"

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            {title && <h1 className={titleClasses}>{title}</h1>}
            {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {showHome && (
              <button
                onClick={() => router.push('/')}
                className={gradient
                  ? "px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition flex items-center gap-2"
                  : "px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            )}

            {user ? (
              <>
                {showDashboard && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className={gradient
                      ? "px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition"
                      : "px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    }
                  >
                    Dashboard
                  </button>
                )}
                <div className={gradient
                  ? "flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/20"
                  : "flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg"
                }>
                  <div className="text-right">
                    <div className={gradient
                      ? "text-sm font-semibold text-white"
                      : "text-sm font-semibold text-gray-900"
                    }>
                      {profile?.full_name || profile?.company_name || user.email}
                    </div>
                    {profile?.company_name && profile?.full_name && (
                      <div className={gradient
                        ? "text-xs text-indigo-100"
                        : "text-xs text-gray-600"
                      }>{profile.company_name}</div>
                    )}
                  </div>
                  <span className={gradient
                    ? "px-3 py-1 bg-white/20 text-white rounded-full text-xs font-medium capitalize"
                    : "px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize"
                  }>
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
                  className={gradient
                    ? "px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition"
                    : "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  }
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className={gradient
                    ? "px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-semibold"
                    : "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  }
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
