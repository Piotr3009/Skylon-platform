'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [myBids, setMyBids] = useState([])
  const [stats, setStats] = useState({ activeProjects: 0, totalTasks: 0, myBids: 0 })
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

    // Load role-specific data
    if (profileData?.role === 'subcontractor') {
      await loadSubcontractorData(user.id)
    } else if (profileData?.role === 'owner' || profileData?.role === 'coordinator') {
      await loadAdminData(user.id)
    }

    setLoading(false)
  }

  const loadSubcontractorData = async (userId) => {
    // Load active projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, description, status, start_date, project_image_url, project_type')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)

    if (projectsData) setProjects(projectsData)

    // Load user's bids
    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        tasks(
          id, 
          name, 
          status,
          categories(
            id, 
            name,
            projects(id, name)
          )
        )
      `)
      .eq('subcontractor_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (bidsData) {
      // Flatten the nested data
      const formattedBids = bidsData.map(bid => ({
        ...bid,
        task_name: bid.tasks?.name || 'Unknown',
        category_name: bid.tasks?.categories?.name || 'Unknown',
        project_name: bid.tasks?.categories?.projects?.name || 'Unknown',
        project_id: bid.tasks?.categories?.projects?.id
      }))
      setMyBids(formattedBids)
    }

    // Calculate stats
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    const { count: bidsCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('subcontractor_id', userId)

    setStats({
      activeProjects: projectCount || 0,
      totalTasks: tasksCount || 0,
      myBids: bidsCount || 0
    })
  }

  const loadAdminData = async (userId) => {
    // Load user's projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, description, status, created_at, project_image_url, project_type')
      .order('created_at', { ascending: false })
      .limit(6)

    if (projectsData) setProjects(projectsData)

    // Calculate admin stats
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalProjectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    const { count: subcontractorCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'subcontractor')

    // Get all bids stats for admin
    const { count: totalBidsCount, error: totalBidsError } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })


    const { count: pendingBidsCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: acceptedBidsCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')

    // Calculate conversion rate
    const conversionRate = totalBidsCount > 0 
      ? Math.round((acceptedBidsCount / totalBidsCount) * 100) 
      : 0

    setStats({
      activeProjects: projectCount || 0,
      totalProjects: totalProjectCount || 0,
      subcontractors: subcontractorCount || 0,
      totalBids: totalBidsCount || 0,
      pendingBids: pendingBidsCount || 0,
      acceptedBids: acceptedBidsCount || 0,
      conversionRate: conversionRate
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${profile?.full_name || profile?.email}`}
        user={user}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={false}
        gradient={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {(profile?.role === 'owner' || profile?.role === 'coordinator') ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Active Projects</div>
                <div className="text-4xl font-bold text-blue-600">{stats.activeProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Total Projects</div>
                <div className="text-4xl font-bold text-green-600">{stats.totalProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Subcontractors</div>
                <div className="text-4xl font-bold text-purple-600">{stats.subcontractors}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-orange-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Total Proposals</div>
                <div className="text-4xl font-bold text-orange-600">{stats.totalBids || 0}</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Active Projects</div>
                <div className="text-4xl font-bold text-blue-600">{stats.activeProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">Open Tasks</div>
                <div className="text-4xl font-bold text-green-600">{stats.totalTasks}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 p-6 hover:shadow-md transition">
                <div className="text-gray-600 text-sm font-medium mb-1">My Proposals</div>
                <div className="text-4xl font-bold text-purple-600">{stats.myBids}</div>
              </div>
            </>
          )}
        </div>

        {/* Proposals Breakdown - Admin Only */}
        {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-600 text-sm font-medium">Pending</div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pendingBids || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-600 text-sm font-medium">Accepted</div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.acceptedBids || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Awarded contracts</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-600 text-sm font-medium">Conversion Rate</div>
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-indigo-600">{stats.conversionRate || 0}%</div>
              <div className="text-xs text-gray-500 mt-1">Acceptance rate</div>
            </div>
          </div>
        )}

        {/* Verification Alerts */}
        {profile && !profile.email_verified && (
          <div className="mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-yellow-800">Email Verification Required</p>
                    <p className="text-sm text-yellow-700">Verify your email to download documents and access all features</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/verify-email')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                >
                  Verify Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/create-project')}
                className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="font-bold text-blue-900 text-lg mb-1">Create Project</div>
                <div className="text-sm text-blue-700">Add a new construction project</div>
              </button>

              <button
                onClick={() => router.push('/admin/projects')}
                className="p-6 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-500 hover:bg-green-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="font-bold text-green-900 text-lg mb-1">Manage Projects</div>
                <div className="text-sm text-green-700">View and edit existing projects</div>
              </button>

              <button
                onClick={() => router.push('/')}
                className="p-6 border-2 border-purple-300 bg-purple-50 rounded-lg hover:border-purple-500 hover:bg-purple-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="font-bold text-purple-900 text-lg mb-1">Public View</div>
                <div className="text-sm text-purple-700">See how subcontractors view projects</div>
              </button>
            </div>
          </div>
        )}

        {/* Subcontractor Rating */}
        {profile?.role === 'subcontractor' && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Your Rating</h3>
                <p className="text-sm text-gray-600">Based on quality, timeliness, and budget adherence</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-8 h-8 ${
                        star <= (profile?.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-2xl font-bold text-gray-900">{(profile?.rating || 0).toFixed(1)} / 5.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Subcontractor Quick Actions */}
        {profile?.role === 'subcontractor' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="p-6 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-500 hover:bg-green-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="font-bold text-green-900 text-lg mb-1">Company Profile</div>
                <div className="text-sm text-green-700">Manage documents & details</div>
              </button>

              <button
                onClick={() => router.push('/dashboard/history')}
                className="p-6 border-2 border-purple-300 bg-purple-50 rounded-lg hover:border-purple-500 hover:bg-purple-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-bold text-purple-900 text-lg mb-1">Project History</div>
                <div className="text-sm text-purple-700">View ratings and completed work</div>
              </button>

              <button
                onClick={() => router.push('/')}
                className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="font-bold text-blue-900 text-lg mb-1">Browse Projects</div>
                <div className="text-sm text-blue-700">Find and bid on new opportunities</div>
              </button>

              <button
                onClick={() => router.push('/')}
                className="p-6 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-500 hover:bg-green-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="font-bold text-green-900 text-lg mb-1">My Proposals</div>
                <div className="text-sm text-green-700">Track submitted bids and status</div>
              </button>
            </div>
          </div>
        )}

        {/* Subcontractor My Bids */}
        {profile?.role === 'subcontractor' && myBids.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-500 rounded"></div>
              My Recent Proposals
            </h3>
            <div className="space-y-3">
              {myBids.map((bid, index) => {
                return (
                  <div key={bid.id}>
                    <div
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition cursor-pointer"
                      onClick={() => router.push(`/projects/${bid.project_id}/task/${bid.task_id}`)}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{bid.task_name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {bid.project_name} → {bid.category_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(bid.price)}</div>
                          <div className="text-sm text-gray-600">{bid.duration} days</div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bid.status}
                        </span>
                      </div>
                    </div>
                    {index < myBids.length - 1 && (
                      <div className="border-b border-blue-100 my-3"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-indigo-500 border-t border-r border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-6 bg-indigo-500 rounded"></div>
              {(profile?.role === 'owner' || profile?.role === 'coordinator')
                ? 'Recent Projects'
                : 'Available Projects'}
            </h3>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No projects available yet</p>
              {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
                <button
                  onClick={() => router.push('/admin/create-project')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Create Your First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-md transition cursor-pointer group bg-white"
                  onClick={() => {
                    if (profile?.role === 'owner' || profile?.role === 'coordinator') {
                      router.push(`/admin/projects/${project.id}`)
                    } else {
                      router.push(`/projects/${project.id}`)
                    }
                  }}
                >
                  {project.project_image_url && (
                    <img
                      src={project.project_image_url}
                      alt={project.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                        {project.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    {project.project_type && (
                      <div className="mb-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          {project.project_type === 'commercial' ? 'Commercial' :
                           project.project_type === 'domestic' ? 'Domestic' :
                           project.project_type === 'restaurant' ? 'Restaurant' :
                           project.project_type}
                        </span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}
                    {project.start_date && (
                      <div className="text-xs text-gray-500">
                        Start: {new Date(project.start_date).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subcontractor Archived Works */}
        {profile?.role === 'subcontractor' && (
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded"></div>
                Archived Works
              </h3>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Value Completed</div>
                <div className="text-2xl font-bold text-green-600">£0</div>
              </div>
            </div>
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No completed projects yet</p>
              <p className="text-sm mt-2">Your finished work will appear here</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}