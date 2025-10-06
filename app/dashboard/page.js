'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
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
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Skylon Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{profile?.email}</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {profile?.role}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Welcome, {profile?.full_name || 'User'}!</h2>
          
          {/* Stats - different for each role */}
          {(profile?.role === 'owner' || profile?.role === 'coordinator') ? (
            // Admin stats
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Role</div>
                <div className="text-2xl font-bold text-blue-900 capitalize">{profile?.role}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Active Projects</div>
                <div className="text-2xl font-bold text-green-900">0</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Total Subcontractors</div>
                <div className="text-2xl font-bold text-purple-900">0</div>
              </div>
            </div>
          ) : (
            // Subcontractor stats
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Role</div>
                <div className="text-2xl font-bold text-blue-900 capitalize">{profile?.role}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Average Rating</div>
                <div className="text-2xl font-bold text-green-900">
                  {profile?.average_rating || '0.00'}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-gray-600 text-sm">Total Projects</div>
                <div className="text-2xl font-bold text-purple-900">{profile?.total_projects || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Role-based content */}
        {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Admin Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => router.push('/admin/create-project')}
                className="p-4 border-2 border-blue-500 rounded hover:bg-blue-50 text-left"
              >
                <div className="font-bold text-blue-900">Create New Project</div>
                <div className="text-sm text-gray-600">Add a new construction project</div>
              </button>
              <button 
                onClick={() => router.push('/admin/projects')}
                className="p-4 border-2 border-green-500 rounded hover:bg-green-50 text-left"
              >
                <div className="font-bold text-green-900">View All Projects</div>
                <div className="text-sm text-gray-600">Manage existing projects</div>
              </button>
              {profile?.role === 'owner' && (
                <button className="p-4 border-2 border-purple-500 rounded hover:bg-purple-50 text-left">
                  <div className="font-bold text-purple-900">Manage Coordinators</div>
                  <div className="text-sm text-gray-600">Add or remove coordinators</div>
                </button>
              )}
            </div>
          </div>
        )}

        {profile?.role === 'subcontractor' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Available Projects</h3>
            <p className="text-gray-600">Browse open projects and submit bids</p>
          </div>
        )}
      </main>
    </div>
  )
}